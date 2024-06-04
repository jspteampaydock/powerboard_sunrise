import {onMounted} from 'vue';
import useCustomerTools from "hooks/useCustomerTools";
import useCartTools from "hooks/useCartTools";
import useCart from "hooks/useCart";
import platform from "platform";

import * as paydockStore from "./PaydockStore";
import '@paydock-commercetools/paydock/dist/widget.css';
import fetchWithToken from "@/apollo/auth";
import config from "../../../../sunrise.config";
import {ACCESS_TOKEN} from "@/constants";

export default {
    name: 'PaydockCheckout',

    setup() {
        /* eslint-disable */
        const {customer} = useCustomerTools();
        const {cart} = useCart();
        const cartTools = useCartTools();
        let commerceToolCustomerId = null;
        if (customer?.value?.customerId) commerceToolCustomerId = customer?.value?.customerId;

        async function initPaydockCheckout(paymentMethod, paydockStore, configuration, PaydockCommercetoolWidget) {
            let widget = new PaydockCommercetoolWidget({
                selector: '#' + paymentMethod.name,
                type: paymentMethod.type,
                configuration: configuration,
                userId: commerceToolCustomerId,
                paymentButtonSelector: '#paymentButton',
                radioGroupName: 'payment_method',
            });

            await widget.displayPaymentMethods(paymentMethod);
            await widget.loadWidget();
            handlePaymentButtonClick.call(widget, widget.paymentButtonSelector, widget.radioGroupName);

            if (widget) {
                let fraction = 10 ** cart.value.totalPrice.fractionDigits;
                let currencyCode = cart.value.totalPrice.currencyCode;
                let totalPrice = cart.value.totalPrice.centAmount / fraction;
                widget.setAmount(totalPrice);
                widget.setCurrency(currencyCode);
            }


            const propertyName = paymentMethod.name.replace(/-/g, '');

            paydockStore[propertyName + 'WidgetInstance'] = widget;
            paydockStore[propertyName + 'GetWidget'] = widget.widget;

            let paymentButtonElem = document.querySelector("#paymentButton a");
            paydockStore[propertyName + 'WidgetInstance'].setPaymentButtonElem(paymentButtonElem);

            if (customer?.value?.customerId) {
                if (paymentMethod.name === "paydock-pay-bank-accounts" || paymentMethod.name === "paydock-pay-card") {
                    const getWidgetPropertyName = propertyName + 'GetWidget';

                    if (widget.isSaveCardEnable()) {
                        widget.renderSaveCardCheckbox();
                        widget.renderCredentialsSelect();
                    }

                    paydockStore[getWidgetPropertyName].on('afterLoad', () => {
                        const checkboxName = paymentMethod.name === "paydock-pay-bank-accounts" ? 'saveBA' : 'saveCard';
                        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);

                        if (!checkbox) return;
                        checkbox.addEventListener('change', (e) => {
                            const savePropertyName = paymentMethod.name === "paydock-pay-bank-accounts" ? 'bankSave' : 'cardSave';
                            paydockStore[savePropertyName] = e.currentTarget.checked;
                        });
                    });
                }
            }
            if (('paydock-pay-afterpay_v2' === paymentMethod.name) && widget.checkIfAfterpayAfterRedirect()) {
                let selector = `input[name="${widget.radioGroupName}"][value="paydock-pay-afterpay_v2"]`;
                let element = document.querySelectorAll(selector);
                if (element.length) {
                    element[0].parentElement.lastChild.click()
                }
            }
        }

        const loadPayDockScript = () => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = "https://widget.paydock.com/sdk/latest/widget.umd.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const handlePaymentButtonClick = async (paymentButtonSelector, radioGroupName) => {
            const paymentButton = document.querySelector(paymentButtonSelector);
            if (paymentButton) {
                paymentButton.addEventListener('click', () => {
                    const selectedRadio = document.querySelector(`input[name="${radioGroupName}"]:checked`);
                    if (selectedRadio) paydockStore.PaymentMethod = selectedRadio.value;
                });
            }
        }

        const getPaydockPaymentsConfiguration = async () => {

            let paydockPaymentConfigurations = {};
            // let fraction = 10 ** cart.value.totalPrice.fractionDigits;
            let currencyCode = cart.value.totalPrice.currencyCode;
            let totalPrice = cart.value.totalPrice.centAmount;
            const getPaymentMethodsRequest = {};
            if (commerceToolCustomerId) {
                getPaymentMethodsRequest.CommerceToolsUserId = commerceToolCustomerId
            }
            let response = await fetchWithToken(`${config.ct.api}/${config.ct.auth.projectKey}/payments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amountPlanned: {
                        currencyCode: currencyCode,
                        centAmount: totalPrice
                    },
                    paymentMethodInfo: {
                        paymentInterface: 'Mock',
                        method: 'paydock-pay',
                        name: {
                            en: 'Paydock'
                        }
                    },
                    custom: {
                        type: {
                            typeId: 'type',
                            key: "paydock-components-payment-type"
                        },
                        fields: {
                            commercetoolsProjectKey: config.ct.auth.projectKey,
                            PaymentExtensionRequest: JSON.stringify({action:"getPaymentMethodsRequest",request: getPaymentMethodsRequest})
                        }
                    },
                    transactions: [
                        {
                            type: "Charge",
                            amount: {
                                currencyCode: "AUD",
                                centAmount: totalPrice
                            },
                            state: "Initial"
                        }
                    ]
                }),
            });

            let payment = await response.json();
            paydockPaymentConfigurations.paymentId = payment?.id ?? "";
            paydockStore.paymentId = payment?.id ?? "";
            paydockPaymentConfigurations.paymentVersion = payment?.version ?? "";
            paydockPaymentConfigurations.api_commercetools = {
                url: `${config.ct.api}/${config.ct.auth.projectKey}/payments/`,
                token: localStorage.getItem(ACCESS_TOKEN)
            };

            const paymentMethodsResponse = payment?.custom?.fields?.PaymentExtensionResponse ?? "";
            if(paymentMethodsResponse) {
                let config = paydockPaymentConfigurations;
                paydockPaymentConfigurations = JSON.parse(paymentMethodsResponse);
                paydockPaymentConfigurations['api_commercetools'] = {}
                paydockPaymentConfigurations['api_commercetools']['url'] = config['api_commercetools']['url'];
                paydockPaymentConfigurations['api_commercetools']['token'] = config['api_commercetools']['token'];
                paydockPaymentConfigurations['paymentId'] = config['paymentId'];
                paydockPaymentConfigurations['paymentVersion'] = config['paymentVersion'];
            }
            if (paydockPaymentConfigurations) return paydockPaymentConfigurations;
        }

        onMounted(async () => {
            await loadPayDockScript();
            const { default: PaydockCommercetoolWidget } = await import('@paydock-commercetools/paydock');
            const configuration = await getPaydockPaymentsConfiguration();
            const platformName = platform.os.family; 
            const isApple = platformName === 'OS X' || platformName === 'iOS'|| platformName === 'iPadOS';

            if (configuration && configuration.payment_methods) {
                Object.values(configuration?.payment_methods).forEach(paymentMethod => {
                    if ((paymentMethod.type === 'apple-pay' && !isApple) || (paymentMethod.type === 'google-pay' && isApple)) return;
                    Object.entries(paymentMethod.config).forEach(([key, value]) => {
                        if (key.includes('use_on_checkout') && value === 'Yes') {
                            initPaydockCheckout(paymentMethod, paydockStore, configuration, PaydockCommercetoolWidget);
                        }
                    });
                });
            }
        })
    }
}
