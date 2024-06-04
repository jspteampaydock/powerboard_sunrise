import fetchWithToken from "@/apollo/auth";
import config from '../../../../sunrise.config';
import useCustomerTools from "hooks/useCustomerTools";
import * as paydockStore from "./PaydockStore";
import {paydockMapperDataHelper} from "presentation/PaydockCheckout/PaydockMapperDataHelper";

export function usePaydockPayment() {

    function collectData(cart) {
        let commerceToolCustomerId = 'not authorized';
        const {customer} = useCustomerTools();
        if (customer.value) {
            commerceToolCustomerId = customer.value.customerId;
        }
        let fraction = 10 ** cart.value.totalPrice.fractionDigits;
        let centAmount = cart.value.totalPrice.centAmount;
        let totalPrice = centAmount / fraction;
        let currencyCode = cart.value.totalPrice.currencyCode;
        let cartId = cart.value.cartId;
        let headers = {'Content-Type': 'application/json'};
        return {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers};
    }

    const createPaymentViaPaydockWallets = async (cart, type) => {
        const paydockResponseInput = 'payment_source_' + type;
        let paydockResponse = document.querySelector('[name="' + paydockResponseInput + '"]').value;
        if (!paydockResponse) {
            return;
        }

        let status = null;
        paydockResponse = JSON.parse(paydockResponse);
        let chargeId = paydockResponse.data.id;
        if (paydockResponse.data.status === "inreview") {
            status = 'paydock-pending'
        } else {
            status = paydockResponse.data.status === 'pending' ? 'paydock-authorize' : 'paydock-paid';
        }

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        let paymentType = type;
        let paymentId;

        switch (type) {
            case 'paydock-pay-google-pay':
                paymentType = 'Google Pay';
                paydockStore?.paydockpaygooglepayWidgetInstance.setAmount(totalPrice);
                paydockStore?.paydockpaygooglepayWidgetInstance.setCurrency(currencyCode);
                paymentId = paydockStore?.paydockpaygooglepayWidgetInstance.paymentId;
                break;
            case 'paydock-pay-afterpay_v2':
                paymentType = 'Afterpay v2';
                paydockStore?.paydockpayafterpay_v2WidgetInstance.setAmount(totalPrice);
                paydockStore?.paydockpayafterpay_v2WidgetInstance.setCurrency(currencyCode);
                paymentId = paydockStore?.paydockpayafterpay_v2WidgetInstance.paymentId;
                break;
            case 'paydock-pay-paypal_smart':
                paymentType = 'PayPal Smart';
                paydockStore?.paydockpaypaypal_smartWidgetInstance.setAmount(totalPrice);
                paydockStore?.paydockpaypaypal_smartWidgetInstance.setCurrency(currencyCode);
                paymentId = paydockStore?.paydockpaypaypal_smartWidgetInstance.paymentId;
                break;
            default:
        }

        let additionalInfo = await getAdditionalInfoByCart(cart, chargeId, paymentId, paymentType);

        const saveCard = false;

        await createPayment({
            paymentId,
            paymentType,
            status,
            commerceToolCustomerId,
            cartId,
            headers,
            cart,
            paymentSource: chargeId,
            vaultToken: chargeId,
            centAmount,
            currencyCode,
            saveCard,
            additionalInfo
        });
    };

    const createPaymentViaPaydockBank = async (cart) => {

        let paymentSource = document.querySelector('input[name="payment_source_bank_accounts_token"]').value;
        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        paydockStore?.paydockpaybankaccountsWidgetInstance.setAmount(totalPrice)
        paydockStore?.paydockpaybankaccountsWidgetInstance.setCurrency(currencyCode);
        paydockStore?.paydockpaybankaccountsWidgetInstance.setPaymentSource(paymentSource);
        const paymentId = paydockStore?.paydockpaybankaccountsWidgetInstance.paymentId;
        const paymentType = 'bank_accounts';

        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);
        paydockStore?.paydockpaybankaccountsWidgetInstance.setAdditionalInfo(additionalInfo);
        let response = await paydockStore?.paydockpaybankaccountsWidgetInstance.process();
        if (!response.success) return false

        const vaultToken = await paydockStore?.paydockpaybankaccountsWidgetInstance.getVaultToken();
        const status = 'paydock-requested';
        const saveCard = paydockStore?.paydockpaybankaccountsWidgetInstance.saveCard;

        await createPayment({
            paymentId,
            paymentType,
            status,
            commerceToolCustomerId,
            cartId,
            headers,
            paymentSource,
            vaultToken,
            centAmount,
            currencyCode,
            saveCard,
            additionalInfo
        });
    };

    const createPaymentViaPaydockCard = async (cart) => {
        let paymentSource = document.querySelector('input[name="payment_source_card_token"]').value;

        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);


        paydockStore?.paydockpaycardWidgetInstance.setAmount(totalPrice)
        paydockStore?.paydockpaycardWidgetInstance.setCurrency(currencyCode);
        paydockStore?.paydockpaycardWidgetInstance.setPaymentSource(paymentSource);

        const paymentId = paydockStore?.paydockpaycardWidgetInstance.paymentId;
        const paymentType = 'card';
        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);
        paydockStore?.paydockpaycardWidgetInstance.setAdditionalInfo(additionalInfo);

        let response = await paydockStore?.paydockpaycardWidgetInstance.process();

        if (!response.success) return false

        const vaultToken = await paydockStore?.paydockpaycardWidgetInstance.getVaultToken();

        if (response.charge3dsId !== undefined) {
            additionalInfo.charge3dsId = response.charge3dsId;
        }

        const status = 'paydock-paid';
        const saveCard = paydockStore?.paydockpaycardWidgetInstance.saveCard;

        await createPayment({
            paymentId,
            paymentType,
            status,
            commerceToolCustomerId,
            cartId,
            headers,
            paymentSource,
            vaultToken,
            centAmount,
            currencyCode,
            saveCard,
            additionalInfo
        });
    };


    const createPaymentViaAPIMSPaydock = async (cart, type) => {
        let paymentSource = document.querySelector('input[name="payment_source_apm_token"]').value;
        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        let paymentType = null;
        let paymentId;
        let items = [];
        switch (type) {
            case 'paydock-pay-zippay':
                paydockStore?.paydockpayzippayWidgetInstance.setAmount(totalPrice);
                paydockStore?.paydockpayzippayWidgetInstance.setCurrency(currencyCode);
                items = paydockStore?.paydockpayzippayWidgetInstance.getCartItems();
                paymentId = paydockStore?.paydockpayzippayWidgetInstance.paymentId;
                paymentType = 'Zippay';
                break;
            case 'paydock-pay-afterpay_v1':
                paydockStore?.paydockpayafterpay_v1WidgetInstance.setAmount(totalPrice);
                paydockStore?.paydockpayafterpay_v1WidgetInstance.setCurrency(currencyCode);
                items = paydockStore?.paydockpayafterpay_v1WidgetInstance.getCartItems();
                paymentId = paydockStore?.paydockpayafterpay_v1WidgetInstance.paymentId;
                paymentType = 'Afterpay v1';
                break;
            default:
        }

        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);
        if (items) {
            additionalInfo.items = items;
        }

        const status = 'paydock-requested';
        const saveCard = false;

        await createPayment({
            paymentId,
            paymentType,
            status,
            commerceToolCustomerId,
            cartId,
            headers,
            paymentSource,
            vaultToken: paymentSource,
            centAmount,
            currencyCode,
            saveCard,
            additionalInfo
        });
    };

    async function retryUpdatePayment(url, headers, data, retries = 3) {
        for (let i = 0; i < retries; i++) {
            const response = await fetchWithToken(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (response.status === 409) {
                const error = await response.json();
                if (error.errors[0].code === 'ConcurrentModification') {
                    data.version = error.errors[0].currentVersion;
                } else {
                    return null;
                }
            } else {
                return response;
            }
        }
        return null;
    }

    async function createPayment({
                                     paymentId,
                                     paymentType,
                                     status,
                                     commerceToolCustomerId,
                                     cartId,
                                     headers,
                                     paymentSource,
                                     vaultToken,
                                     centAmount,
                                     currencyCode,
                                     saveCard,
                                     additionalInfo
                                 }) {
        let currentPaymentUrl = `${config.ct.api}/${config.ct.auth.projectKey}/payments/${paymentId}`;
        let response = await fetchWithToken(currentPaymentUrl, {
            method: 'GET',
            headers: headers
        });
        let currentPayment = await response.json();
        const reference = paymentId;
        const updateData = {
            version: currentPayment.version,
            actions: [
                {
                    action: "setCustomField",
                    name: "makePaymentRequest",
                    value: JSON.stringify({
                        orderId: reference,
                        paymentId: paymentId,
                        amount: {
                            currency: currencyCode,
                            value: centAmount
                        },
                        PaydockTransactionId: paymentSource,
                        PaydockPaymentStatus: status,
                        PaydockPaymentType: paymentType,
                        CommerceToolsUserId: commerceToolCustomerId,
                        SaveCard: saveCard,
                        VaultToken: vaultToken,
                        AdditionalInfo: additionalInfo
                    })
                }
            ]
        };

        response = await retryUpdatePayment(currentPaymentUrl, headers, updateData);
        if (!response) {
            return Promise.reject("Invalid Transaction Details");
        }

        let payment = await response.json();
        let orderPaymentStatus = 'Pending'
        let orderStatus = 'Open'
        let paydockWidgetCardServerErrorBlock = document.getElementById('paydock-widget-card-server-error');
        let paymentExtensionResponse = payment?.custom?.fields?.PaymentExtensionResponse ?? null
        if (paymentExtensionResponse) {
            paymentExtensionResponse = JSON.parse(paymentExtensionResponse);
            if (paymentExtensionResponse.status === "Failure") {
                paydockWidgetCardServerErrorBlock.innerText = paymentExtensionResponse.message;
                paydockWidgetCardServerErrorBlock.classList.remove("hide");
                return Promise.reject(paymentExtensionResponse.message);
            }else{
                orderPaymentStatus = paymentExtensionResponse.orderPaymentStatus
                orderStatus = paymentExtensionResponse.orderStatus
            }
        }
        response = await fetchWithToken(`${config.ct.api}/${config.ct.auth.projectKey}/carts/${cartId}`, {
            method: 'GET',
            headers: headers
        });
        let currentCart = await response.json();
        response = await fetchWithToken(`${config.ct.api}/${config.ct.auth.projectKey}/carts/${cartId}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                version: currentCart.version,
                actions: [
                    {
                        action: "addPayment",
                        payment: {
                            typeId: "payment",
                            id: payment.id
                        }
                    }
                ]
            }),
        });
        currentCart = await response.json();
        await fetchWithToken(`${config.ct.api}/${config.ct.auth.projectKey}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: currentCart.id,
                orderNumber: reference,
                version: currentCart.version,
                orderState: orderStatus,
                paymentState: orderPaymentStatus
            }),
        });
    }


    async function getAdditionalInfoByCart(cart, chargeId, paymentId, paymentType) {
        let billingAddress = cart.value.billingAddress;
        let shippingAddress = cart.value.shippingAddress;
        if (!billingAddress) {
            let responseCart = await fetchWithToken(`${config.ct.api}/${config.ct.auth.projectKey}/carts/${cart.value.cartId}`, {
                method: 'GET',
                headers: {'Content-Type': 'application/json'}
            });
            cart = await responseCart.json();
            billingAddress = cart.billingAddress;
            shippingAddress = cart.shippingAddress;
        }
        if('card' === paymentType){
            const {paydockConvertAddress} = paydockMapperDataHelper();
            paydockStore?.paydockpaycardWidgetInstance.setBillingInfo(paydockConvertAddress(billingAddress));
            paydockStore?.paydockpaycardWidgetInstance.setShippingInfo(paydockConvertAddress(shippingAddress));
        }
        let billingInformation = {
            name: billingAddress?.firstName + " " + billingAddress?.lastName,
            address: billingAddress?.city + ", " + billingAddress?.streetName + " " + billingAddress?.additionalStreetInfo,
        };
        let shippingInformation;
        if (shippingAddress) {
            shippingInformation = {
                name: shippingAddress?.firstName + " " + shippingAddress?.lastName,
                address: shippingAddress?.city + ", " + shippingAddress?.streetName + " " + shippingAddress?.additionalStreetInfo,
            };
        }

        return {
            address_country: billingAddress?.country ?? 'AU',
            address_city: billingAddress?.city ?? '',
            address_line: billingAddress?.streetName ?? '',
            address_line2: billingAddress?.additionalStreetInfo ?? '',
            address_postcode: billingAddress?.postalCode ?? '',
            billing_first_name: billingAddress?.firstName ?? '',
            billing_last_name: billingAddress?.lastName ?? '',
            billing_email: billingAddress?.email ?? '',
            billing_phone: billingAddress?.phone ?? '',
            BillingInformation: billingInformation,
            ShippingInformation: shippingInformation ?? null,
            order_id: paymentId,
            charge_id: chargeId
        };
    }

    async function redirectToThankYouPage(router) {
        let currentPaymentUrl = `${config.ct.api}/${config.ct.auth.projectKey}/payments/${paydockStore?.paymentId}`;
        const response = await fetchWithToken(currentPaymentUrl, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        let currentPayment = await response.json();
        let selectedPaymentMethod = paydockStore?.PaymentMethod;

        let orderStatusInReview = currentPayment.custom.fields.PaydockPaymentStatus === 'paydock-pending' ? 'yes' : 'no'
        router.push({
            name: 'pay',
            query: {inreview: orderStatusInReview},
            params: {method: selectedPaymentMethod},
        });
    }


    return {
        createPaymentViaPaydockWallets,
        createPaymentViaPaydockBank,
        createPaymentViaPaydockCard,
        createPaymentViaAPIMSPaydock,
        redirectToThankYouPage
    };
}
