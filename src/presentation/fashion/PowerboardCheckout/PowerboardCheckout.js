import {onMounted} from 'vue';
import useCustomerTools from "hooks/useCustomerTools";
import useCartTools from "hooks/useCartTools";
import useCart from "hooks/useCart";
import platform from "platform";

import * as powerboardStore from "./PowerboardStore";
import '@power-board-commercetools/powerboard/dist/widget.css';
import fetchWithToken from "@/apollo/auth";
import config from "../../../../sunrise.config";
import {ACCESS_TOKEN} from "@/constants";

export default {
    name: 'PowerboardCheckout',

    setup() {
        /* eslint-disable */
        const {customer} = useCustomerTools();
        const {cart} = useCart();
        const cartTools = useCartTools();
        let commerceToolCustomerId = null;
        if (customer?.value?.customerId) commerceToolCustomerId = customer?.value?.customerId;

        async function initPowerboardCheckout(paymentMethod, powerboardStore, configuration, PowerboardCommercetoolsWidget) {
            let widget = new PowerboardCommercetoolsWidget({
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

            powerboardStore[propertyName + 'WidgetInstance'] = widget;
            powerboardStore[propertyName + 'GetWidget'] = widget.widget;

            let paymentButtonElem = document.querySelector("#paymentButton a");
            powerboardStore[propertyName + 'WidgetInstance'].setPaymentButtonElem(paymentButtonElem);

            if (customer?.value?.customerId) {
                if (paymentMethod.name === "powerboard-pay-bank-accounts" || paymentMethod.name === "powerboard-pay-card") {
                    const getWidgetPropertyName = propertyName + 'GetWidget';

                    if (widget.isSaveCardEnable()) {
                        widget.renderSaveCardCheckbox();
                        widget.renderCredentialsSelect();
                    }

                    powerboardStore[getWidgetPropertyName].on('afterLoad', () => {
                        const checkboxName = paymentMethod.name === "powerboard-pay-bank-accounts" ? 'saveBA' : 'saveCard';
                        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);

                        if (!checkbox) return;
                        checkbox.addEventListener('change', (e) => {
                            const savePropertyName = paymentMethod.name === "powerboard-pay-bank-accounts" ? 'bankSave' : 'cardSave';
                            powerboardStore[savePropertyName] = e.currentTarget.checked;
                        });
                    });
                }
            }
            if (('powerboard-pay-afterpay_v2' === paymentMethod.name) && widget.checkIfAfterpayAfterRedirect()) {
                let selector = `input[name="${widget.radioGroupName}"][value="powerboard-pay-afterpay_v2"]`;
                let element = document.querySelectorAll(selector);
                if (element.length) {
                    element[0].parentElement.lastChild.click()
                }
            }
        }

        const loadPowerboardScript = (url) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
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
                    if (selectedRadio) powerboardStore.PaymentMethod = selectedRadio.value;
                });
            }
        }

        const getPowerboardPaymentsConfiguration = async () => {

            let powerboardPaymentConfigurations = {};
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
                        method: 'powerboard-pay',
                        name: {
                            en: 'Powerboard'
                        }
                    },
                    custom: {
                        type: {
                            typeId: 'type',
                            key: "powerboard-components-payment-type"
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
            powerboardPaymentConfigurations.paymentId = payment?.id ?? "";
            powerboardStore.paymentId = powerboardPaymentConfigurations.paymentId;
            powerboardPaymentConfigurations.paymentVersion = payment?.version ?? "";
            powerboardPaymentConfigurations.api_commercetools = {
                url: `${config.ct.api}/${config.ct.auth.projectKey}/payments/`,
                token: localStorage.getItem(ACCESS_TOKEN)
            };

            const paymentMethodsResponse = payment?.custom?.fields?.PaymentExtensionResponse ?? "";
            if(paymentMethodsResponse) {
                let config = powerboardPaymentConfigurations;
                powerboardPaymentConfigurations = JSON.parse(paymentMethodsResponse);
                powerboardPaymentConfigurations['api_commercetools'] = {}
                powerboardPaymentConfigurations['api_commercetools']['url'] = config['api_commercetools']['url'];
                powerboardPaymentConfigurations['api_commercetools']['token'] = config['api_commercetools']['token'];
                powerboardPaymentConfigurations['paymentId'] = config['paymentId'];
                powerboardPaymentConfigurations['paymentVersion'] = config['paymentVersion'];
            }

            if (powerboardPaymentConfigurations) return powerboardPaymentConfigurations;   
        }

        onMounted(async () => {
            const PRODUCTION_POWERBOARD_URL = 'https://widget.powerboard.commbank.com.au/sdk/latest/widget.umd.js';
            const SANDBOX_POWERBOARD_URL = 'https://widget.preproduction.powerboard.commbank.com.au/sdk/latest/widget.umd.js';
            const configuration = await getPowerboardPaymentsConfiguration();
            const isSandbox = configuration?.sandbox_mode; 
            isSandbox === 'Yes' ? await loadPowerboardScript(SANDBOX_POWERBOARD_URL) : await loadPowerboardScript(PRODUCTION_POWERBOARD_URL)
            const { default: PowerboardCommercetoolsWidget } = await import('@power-board-commercetools/powerboard');
            
            const platformName = platform.os.family; 
            const isApple = platformName === 'OS X' || platformName === 'iOS'|| platformName === 'iPadOS';

            if (configuration && configuration.payment_methods) {
                Object.values(configuration.payment_methods).forEach(paymentMethod => {
                    if ((paymentMethod.type === 'apple-pay' && !isApple) || (paymentMethod.type === 'google-pay' && isApple)) return;
                    Object.entries(paymentMethod.config).forEach(([key, value]) => {
                        if (key.includes('use_on_checkout') && value === 'Yes') {
                            initPowerboardCheckout(paymentMethod, powerboardStore, configuration, PowerboardCommercetoolsWidget);
                        }
                    });
                });
            }
        })
    }
}
