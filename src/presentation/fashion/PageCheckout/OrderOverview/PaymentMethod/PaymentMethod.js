import { onMounted, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PaydockCheckout from 'presentation/PaydockCheckout/PaydockCheckout.vue';
import PowerboardCheckout from 'presentation/PowerboardCheckout/PowerboardCheckout.vue';

let paymentMethods = [
  {
    name: 'card',
    description: 'creditCard',
    image: 'CREDIT CARDS',
  }
];
export default {
  props: {
    paymentMethod: {
      type: String,
      required: false,
    },
  },
  components:{
    PaydockCheckout,
    PowerboardCheckout
  },
  setup(props, { emit }) {
    onMounted(() => emit('card-paid'));
    const pm = shallowRef(props.paymentMethod);
    const { t } = useI18n();
    watch(pm, (pm) => {
      emit('payment-changed', pm); 
    });

    const getImgUrl = (name) => {
      var images = require.context(
        'presentation/assets/img/',
        false,
        /\.png$/
      );
      return images(`./${name}.png`);
    };

    return { pm, t, paymentMethods, getImgUrl };
  },
};
