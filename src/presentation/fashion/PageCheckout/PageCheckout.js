import BillingDetails from './BillingDetails/BillingDetails.vue';
import OrderOverview from './OrderOverview/OrderOverview.vue';
import ServerError from 'presentation/components/ServerError/ServerError.vue';

import {shallowRef, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useRouter} from 'vue-router';
import useCart from 'hooks/useCart';
import useCartTools from 'hooks/useCartTools';
import * as paydockStore from 'presentation/PaydockCheckout/PaydockStore';
import {usePaydockPayment} from "presentation/PaydockCheckout/PaydockUsePayment";
import {paydockMapperDataHelper} from "presentation/PaydockCheckout/PaydockMapperDataHelper";
import * as powerboardStore from 'presentation/PowerboardCheckout/PowerboardStore';
import {usePowerboardPayment} from "presentation/PowerboardCheckout/PowerboardUsePayment";
import {powerboardMapperDataHelper} from "presentation/PowerboardCheckout/PowerboardMapperDataHelper";

export default {
    components: {
        // CheckoutTopSection,
        OrderOverview,
        BillingDetails,
        ServerError
    },
    setup() {
        const {t} = useI18n();
        const router = useRouter();
        const billingAddressStorageKey = 'paydock-billing-address';
        const shippingAddressStorageKey = 'paydock-shipping-address';
        const afterpayParams = Object.fromEntries(new URLSearchParams(location.search));
        const shippingMethod = shallowRef(null);
        const billingAddress = shallowRef(null);
        const shippingAddress = shallowRef(null);
        const validBillingForm = shallowRef(false);
        const validShippingForm = shallowRef(true);
        const paymentMethod = shallowRef('card');
        const showError = shallowRef(false);
        const error = shallowRef(null);
        const {cart, loading} = useCart();
        const cartTools = useCartTools();
        let timeout = null;

        //update cart and wallet billing? sipping and cart item info.
        const updateCart = () => {
            if (timeout) {
                window.clearTimeout(timeout)
            }

            timeout = window.setTimeout(() => {
                cartTools.setAddressForCart({
                    billingAddress,
                    shippingAddress,
                })


                //update info in all payment methodes
                const {paydockConvertAddress, paydockConvertCartItems} = paydockMapperDataHelper();
                for (let paymentMethodKey in paydockStore) {
                    if (
                        paydockStore[paymentMethodKey]?.wallets?.includes(paydockStore[paymentMethodKey]?.type)
                        || paydockStore[paymentMethodKey]?.apims?.includes(paydockStore[paymentMethodKey]?.type)
                    ) {
                        paydockStore[paymentMethodKey].setRefernce(cart.value?.cartId);
                        paydockStore[paymentMethodKey].setBillingInfo(paydockConvertAddress(billingAddress.value));
                        paydockStore[paymentMethodKey].setShippingInfo(paydockConvertAddress(shippingAddress.value));

                        if (cart.value?.lineItems?.length) {
                            paydockStore[paymentMethodKey].setCartItems(paydockConvertCartItems(cart.value.lineItems));
                        }

                        paydockStore[paymentMethodKey].setIsValidForm(validBillingForm.value && validShippingForm.value)
                    }
                }

                const {powerboardConvertAddress, powerboardConvertCartItems} = powerboardMapperDataHelper();
                for (let paymentMethodKey in powerboardStore) {
                    //check if payment method is wallet or apm
                    if (
                        powerboardStore[paymentMethodKey]?.wallets?.includes(powerboardStore[paymentMethodKey]?.type)
                        || powerboardStore[paymentMethodKey]?.apims?.includes(powerboardStore[paymentMethodKey]?.type)
                    ) {
                        powerboardStore[paymentMethodKey].setRefernce(cart.value?.cartId);
                        powerboardStore[paymentMethodKey].setBillingInfo(powerboardConvertAddress(billingAddress.value));
                        powerboardStore[paymentMethodKey].setShippingInfo(powerboardConvertAddress(shippingAddress.value));

                        if (cart.value?.lineItems?.length) {
                            powerboardStore[paymentMethodKey].setCartItems(powerboardConvertCartItems(cart.value.lineItems));
                        }

                        powerboardStore[paymentMethodKey].setIsValidForm(validBillingForm.value && validShippingForm.value)
                    }
                }
            }, 500)
        }

        //Logic what update cart and wallets billing address information
        watch(billingAddress, (newAddress, prevAddress) => {
            if (newAddress !== prevAddress) {
                updateCart()
            }
        })

        //Logic what update cart and wallets shipping address information
        watch(shippingAddress, (newAddress, prevAddress) => {
            if (newAddress !== prevAddress) {
                updateCart()
            }
        })


        //@todo: what happened to the payment method passed to this?
        const placeOrder = () => {
            if (!validBillingForm.value && (afterpayParams.afterpay !== 'true' || afterpayParams.success !== 'true')) {
                showError.value = true;
                return Promise.resolve();
            }

            if(afterpayParams.afterpay === 'true') {
                if (billingAddress.value === null) {
                    try {
                        billingAddress.value = JSON.parse(window.localStorage.getItem(billingAddressStorageKey));
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (shippingAddress.value === null) {
                    try {
                        shippingAddress.value = JSON.parse(window.localStorage.getItem(shippingAddressStorageKey));
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
            showError.value = false;
            return cartTools
                .setAddressForCart({
                    billingAddress,
                    shippingAddress,
                })
                .then(() => {
                        if (
                            (paydockStore?.PaymentMethod !== null && !['card', 'paypal'].includes(paydockStore?.PaymentMethod))
                            || (powerboardStore?.PaymentMethod !== null && !['card', 'paypal'].includes(powerboardStore?.PaymentMethod))
                        ) {
                            paymentMethod.value = paydockStore?.PaymentMethod;
                            if (paymentMethod.value === 'paydock-pay-card') {
                                const {createPaymentViaPaydockCard, redirectToThankYouPage} = usePaydockPayment();

                                if (paydockStore?.paydockpaycardGetWidget) {
                                    paydockStore?.paydockpaycardWidgetInstance.setAdditionalValue(billingAddress);
                                    if (paydockStore?.paydockpaycardWidgetInstance.hasVaultToken()) {
                                        paydockStore?.paydockpaycardWidgetInstance.setSpinner();
                                        createPaymentViaPaydockCard(cart)
                                            .then(() => {
                                                redirectToThankYouPage(router)
                                            }).catch(() => {
                                            paydockStore?.paydockpaycardWidgetInstance.setSpinner('#' + paymentMethod.value);
                                            paydockStore?.paydockpaycardGetWidget.reload();
                                            return Promise.resolve();
                                        });
                                    } else {
                                        paydockStore?.paydockpaycardGetWidget.trigger('submit_form');
                                        paydockStore?.paydockpaycardGetWidget.on('finish', function () {
                                            paydockStore?.paydockpaycardWidgetInstance.setSpinner();
                                            createPaymentViaPaydockCard(cart)
                                                .then(() => {
                                                    redirectToThankYouPage(router)
                                                }).catch(() => {
                                                paydockStore?.paydockpaycardWidgetInstance.setSpinner('#' + paymentMethod.value);
                                                paydockStore?.paydockpaycardGetWidget.reload();
                                                return Promise.resolve();
                                            });
                                        });
                                    }
                                }
                            }
                            if (['paydock-pay-zippay', 'paydock-pay-afterpay_v1'].includes(paymentMethod.value)) {
                                const {createPaymentViaAPIMSPaydock, redirectToThankYouPage} = usePaydockPayment();
                                const widgetInstances = {
                                    'paydock-pay-zippay': paydockStore?.paydockpayzippayWidgetInstance,
                                    'paydock-pay-afterpay_v1': paydockStore?.paydockpayafterpay_v1WidgetInstance
                                };
                                const widgetInstance = widgetInstances[paymentMethod.value];
                                if (widgetInstance) widgetInstance.setSpinner('#' + paymentMethod.value);
                                createPaymentViaAPIMSPaydock(cart, paymentMethod.value)
                                    .then(() => {
                                        redirectToThankYouPage(router)
                                    }).catch((e) => {
                                    error.value = e;
                                    showError.value = true;
                                });
                            }
                            if (['paydock-pay-paypal_smart', 'paydock-pay-google-pay', 'paydock-pay-afterpay_v2'].includes(paymentMethod.value)) {
                                const {createPaymentViaPaydockWallets, redirectToThankYouPage} = usePaydockPayment();
                                createPaymentViaPaydockWallets(cart, paymentMethod.value)
                                    .then(() => {
                                        redirectToThankYouPage(router)
                                    }).catch(() => {
                                    return Promise.resolve();
                                });
                            }

                            paymentMethod.value = powerboardStore?.PaymentMethod;

                            if (paymentMethod.value === 'powerboard-pay-card') {
                                const {createPaymentViaPowerboardCard, redirectToThankYouPage} = usePowerboardPayment();
                                if (powerboardStore?.powerboardpaycardGetWidget) {
                                    powerboardStore?.powerboardpaycardWidgetInstance.setAdditionalValue(billingAddress);
                                    if (powerboardStore?.powerboardpaycardWidgetInstance.hasVaultToken()) {
                                        powerboardStore?.powerboardpaycardWidgetInstance.setSpinner();
                                        createPaymentViaPowerboardCard(cart)
                                            .then(() => {
                                                redirectToThankYouPage(router)
                                            }).catch(() => {
                                            powerboardStore?.powerboardpaycardWidgetInstance.setSpinner('#' + paymentMethod.value);
                                            powerboardStore?.powerboardpaycardGetWidget.reload();
                                            return Promise.resolve();
                                        });
                                    } else {
                                        powerboardStore?.powerboardpaycardGetWidget.trigger('submit_form');
                                        powerboardStore?.powerboardpaycardGetWidget.on('finish', function () {
                                            powerboardStore?.powerboardpaycardWidgetInstance.setSpinner();
                                            createPaymentViaPowerboardCard(cart)
                                                .then(() => {
                                                    redirectToThankYouPage(router)
                                                }).catch(() => {
                                                powerboardStore?.powerboardpaycardWidgetInstance.setSpinner('#' + paymentMethod.value);
                                                powerboardStore?.powerboardpaycardGetWidget.reload();
                                                return Promise.resolve();
                                            });
                                        });
                                    }
                                }
                            }
                            if (['powerboard-pay-zippay', 'powerboard-pay-afterpay_v1'].includes(paymentMethod.value)) {
                                const {createPaymentViaAPIMSPowerboard, redirectToThankYouPage} = usePowerboardPayment();
                                const widgetInstances = {
                                    'powerboard-pay-zippay': powerboardStore?.paydockpayzippayWidgetInstance,
                                    'powerboard-pay-afterpay_v1': powerboardStore?.paydockpayafterpay_v1WidgetInstance
                                };
                                const widgetInstance = widgetInstances[paymentMethod.value];
                                if (widgetInstance) widgetInstance.setSpinner('#' + paymentMethod.value);
                                createPaymentViaAPIMSPowerboard(cart, paymentMethod.value)
                                    .then(() => {
                                        redirectToThankYouPage(router)
                                    }).catch((e) => {
                                    error.value = e;
                                    showError.value = true;
                                });
                            }
                            if (['powerboard-pay-paypal_smart', 'powerboard-pay-google-pay', 'powerboard-pay-afterpay_v2'].includes(paymentMethod.value)) {
                                const {createPaymentViaPowerboardWallets, redirectToThankYouPage} = usePowerboardPayment();
                                createPaymentViaPowerboardWallets(cart, paymentMethod.value)
                                    .then(() => {
                                        redirectToThankYouPage(router)
                                    }).catch(() => {
                                    return Promise.resolve();
                                });
                            }

                        } else {
                            router.push({
                                name: 'pay',
                                params: {method: paymentMethod.value},
                            });
                        }
                    }
                )
                .catch((e) => {
                    error.value = e;
                });
        };
        watch([cart, loading], ([cart, loading]) => {
            if (!cart && !loading) {
                router.replace({path: '/'});
            }
        });
        const setValidBillingForm = (valid) => {
            validBillingForm.value = valid;
        };

        const setValidShippingForm = (valid) => {
            validShippingForm.value = valid;
        };
        const updateBilling = (billingDetails) => {
            billingAddress.value = JSON.parse(
                JSON.stringify(billingDetails)
            );
        };
        const updateShipping = (shippingDetails) => {
            shippingAddress.value = JSON.parse(
                JSON.stringify(shippingDetails)
            );
        };
        const updateShippingMethod = (shippingId) => {
            shippingMethod.value = shippingId;
        };
        const paymentChanged = (payment) => {
            paymentMethod.value = payment;
        };


        return {
            ...cartTools,
            placeOrder,
            shippingMethod,
            billingAddress,
            shippingAddress,
            validBillingForm,
            validShippingForm,
            showError,
            setValidBillingForm,
            setValidShippingForm,
            updateBilling,
            updateShipping,
            updateShippingMethod,
            paymentMethod,
            paymentChanged,
            error,
            cart,
            t,
        };
    },
};
