import fetchWithToken from "@/apollo/auth";
import config from '../../../../sunrise.config';
import useCustomerTools from "hooks/useCustomerTools";
import * as powerboardStore from "./PowerboardStore";
import {powerboardMapperDataHelper} from "presentation/PowerboardCheckout/PowerboardMapperDataHelper";

export function usePowerboardPayment() {

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

    const createPaymentViaPowerboardWallets = async (cart, type) => {
        const powerboardResponseInput = 'payment_source_' + type;
        let powerboardResponse = document.querySelector('[name="' + powerboardResponseInput + '"]').value;
        if (!powerboardResponse) {
            return;
        }
        powerboardResponse = JSON.parse(powerboardResponse);
        let chargeId = powerboardResponse.data.id;
        let status = null;
        if(powerboardResponse.data.status === "inreview"){
            status =  'powerboard-pending'
        }else{
            status  = powerboardResponse.data.status === 'pending' ? 'powerboard-authorize' : 'powerboard-paid';
        }
        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        let paymentType = type;
        let paymentId;

        switch (type) {
            case 'powerboard-pay-google-pay':
                paymentType = 'Google Pay';
                powerboardStore?.powerboardpaygooglepayWidgetInstance.setAmount(totalPrice);
                powerboardStore?.powerboardpaygooglepayWidgetInstance.setCurrency(currencyCode);
                paymentId = powerboardStore?.powerboardpaygooglepayWidgetInstance.paymentId;
                break;
            case 'powerboard-pay-afterpay_v2':
                paymentType = 'Afterpay v2';
                powerboardStore?.powerboardpayafterpay_v2WidgetInstance.setAmount(totalPrice);
                powerboardStore?.powerboardpayafterpay_v2WidgetInstance.setCurrency(currencyCode);
                paymentId = powerboardStore?.powerboardpayafterpay_v2WidgetInstance.paymentId;
                break;
            case 'powerboard-pay-paypal_smart':
                paymentType = 'PayPal Smart';
                powerboardStore?.powerboardpaypaypal_smartWidgetInstance.setAmount(totalPrice);
                powerboardStore?.powerboardpaypaypal_smartWidgetInstance.setCurrency(currencyCode);
                paymentId = powerboardStore?.powerboardpaypaypal_smartWidgetInstance.paymentId;
                break;
            default:
                console.log('type not found');
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

    const createPaymentViaPowerboardBank = async (cart) => {

        let paymentSource = document.querySelector('input[name="payment_source_bank_accounts_token"]').value;
        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        powerboardStore?.powerboardpaybankaccountsWidgetInstance.setAmount(totalPrice)
        powerboardStore?.powerboardpaybankaccountsWidgetInstance.setCurrency(currencyCode);
        powerboardStore?.powerboardpaybankaccountsWidgetInstance.setPaymentSource(paymentSource);
        const paymentId = powerboardStore?.powerboardpaybankaccountsWidgetInstance.paymentId;

        const paymentType = 'bank_accounts';
        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);
        powerboardStore?.powerboardpaybankaccountsWidgetInstance.setAdditionalInfo(additionalInfo);
        let response = await powerboardStore?.powerboardpaybankaccountsWidgetInstance.process();
        if (!response.success) return false

        const vaultToken = await powerboardStore?.powerboardpaybankaccountsWidgetInstance.getVaultToken();

        const status = 'powerboard-requested';
        const saveCard = powerboardStore?.powerboardpaybankaccountsWidgetInstance.saveCard;

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

    const createPaymentViaPowerboardCard = async (cart) => {
        let paymentSource = document.querySelector('input[name="payment_source_card_token"]').value;

        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);


        powerboardStore?.powerboardpaycardWidgetInstance.setAmount(totalPrice)
        powerboardStore?.powerboardpaycardWidgetInstance.setCurrency(currencyCode);
        powerboardStore?.powerboardpaycardWidgetInstance.setPaymentSource(paymentSource);
        const paymentId = powerboardStore?.powerboardpaycardWidgetInstance.paymentId;
        const paymentType = 'card';

        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);

        powerboardStore?.powerboardpaycardWidgetInstance.setAdditionalInfo(additionalInfo);

        let response = await powerboardStore?.powerboardpaycardWidgetInstance.process();

        if (!response.success) return false

        const vaultToken = await powerboardStore?.powerboardpaycardWidgetInstance.getVaultToken();

        if (response.charge3dsId !== undefined) {
            additionalInfo.charge3dsId = response.charge3dsId;
        }

        const status = 'powerboard-paid';
        const saveCard = powerboardStore?.powerboardpaycardWidgetInstance.saveCard;

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


    const createPaymentViaAPIMSPowerboard = async (cart, type) => {
        let paymentSource = document.querySelector('input[name="payment_source_apm_token"]').value;
        if (!paymentSource) return false

        let {commerceToolCustomerId, currencyCode, cartId, centAmount, totalPrice, headers} = collectData(cart);
        let paymentType = null;
        let paymentId;
        switch (type) {
            case 'powerboard-pay-zippay':
                powerboardStore?.powerboardpayzippayWidgetInstance.setAmount(totalPrice);
                powerboardStore?.powerboardpayzippayWidgetInstance.setCurrency(currencyCode);
                paymentId = powerboardStore?.powerboardpayzippayWidgetInstance.paymentId;
                paymentType = 'Zippay';
                break;
            case 'powerboard-pay-afterpay_v1':
                powerboardStore?.powerboardpayafterpay_v1WidgetInstance.setAmount(totalPrice);
                powerboardStore?.powerboardpayafterpay_v1WidgetInstance.setCurrency(currencyCode);
                paymentId = powerboardStore?.powerboardpayafterpay_v1WidgetInstance.paymentId;
                paymentType = 'Afterpay v1';
                break;
            default:
                console.log('type not found');
        }

        let additionalInfo = await getAdditionalInfoByCart(cart, paymentSource, paymentId, paymentType);

        const status = 'powerboard-requested';
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
                        PowerboardTransactionId: paymentSource,
                        PowerboardPaymentStatus: status,
                        PowerboardPaymentType: paymentType,
                        CommerceToolsUserId: commerceToolCustomerId,
                        SaveCard: saveCard,
                        VaultToken: vaultToken,
                        AdditionalInfo: additionalInfo
                    })
                }
            ]
        };

        response  = await retryUpdatePayment(currentPaymentUrl, headers,  updateData);
        if(!response){
            return Promise.reject("Invalid Transaction Details");
        }

        let payment = await response.json();
        

        let powerboardWidgetCardServerErrorBlock = document.getElementById('powerboard-widget-card-server-error');
        let orderPaymentStatus = 'Pending';
        let orderStatus = 'Open';
        let paymentExtensionResponse = payment?.custom?.fields?.PaymentExtensionResponse ?? null
        if (paymentExtensionResponse) {
            paymentExtensionResponse = JSON.parse(paymentExtensionResponse);
            if (paymentExtensionResponse.status === "Failure") {
                powerboardWidgetCardServerErrorBlock.innerText = paymentExtensionResponse.message;
                powerboardWidgetCardServerErrorBlock.classList.remove("hide");
                return Promise.reject(paymentExtensionResponse.message);
            }else{
                orderPaymentStatus = paymentExtensionResponse.orderPaymentStatus;
                orderStatus = paymentExtensionResponse.orderStatus;
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
            const {powerboardConvertAddress} = powerboardMapperDataHelper();
            powerboardStore?.powerboardpaycardWidgetInstance.setBillingInfo(powerboardConvertAddress(billingAddress));
            powerboardStore?.powerboardpaycardWidgetInstance.setShippingInfo(powerboardConvertAddress(shippingAddress));
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
        let currentPaymentUrl = `${config.ct.api}/${config.ct.auth.projectKey}/payments/${powerboardStore?.paymentId}`;
        const response = await fetchWithToken(currentPaymentUrl, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        let currentPayment = await response.json();
        let selectedPaymentMethod = powerboardStore?.PaymentMethod;

        let orderStatusInReview = currentPayment.custom.fields.PaydockPaymentStatus === 'paydock-pending' ? 'yes' : 'no'
        router.push({
            name: 'pay',
            query: {inreview: orderStatusInReview},
            params: {method: selectedPaymentMethod},
        });
    }

    return {
        createPaymentViaPowerboardWallets,
        createPaymentViaPowerboardBank,
        createPaymentViaPowerboardCard,
        createPaymentViaAPIMSPowerboard,
        redirectToThankYouPage
    };
}
