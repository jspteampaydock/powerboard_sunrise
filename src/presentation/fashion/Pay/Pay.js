import {shallowRef, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {useRoute} from 'vue-router';
import useCart from '../../../../composition/useCart';
import useCartTools from '../../../../composition/useCartTools';
import {cache} from "@/apollo";
import localMessages from './Pay.json';

export default {
    setup() {
        const { t } = useI18n({messages: localMessages});
        const orderComplete = shallowRef(false);
        const route = useRoute();
        const {cart} = useCart();
        const cartTools = useCartTools();
        const saved = shallowRef(false);

        const inReviewParam = route.query.inreview;
        let thankYouMessage = '';

        if (!['card', 'paypal'].includes(route.params.method)) {
            orderComplete.value = true;
            cache.evict({ id: 'activeCart' });
            cache.gc();
            thankYouMessage = inReviewParam === 'yes' ?  'thankYouOrderProcessed' : 'thankYouOrderReceived'
            return {t, orderComplete, thankYouMessage};
        } 

        watch([cart, saved], ([cart, s]) => {
            if (cart && !s) {
                cartTools
                    .createMyOrderFromCart({
                        method: route.params.method,
                        cart,
                    })
                    .then(() => {
                        orderComplete.value = true;
                    })
                    .catch((error) => console.warn('error:', error));
            }
        });

        return {t, orderComplete, thankYouMessage};
    },
};
