import BaseInput from 'presentation/components/BaseInput/BaseInput.vue';
// import BaseSelect from 'presentation/components/BaseSelect/BaseSelect.vue';
import { computed, watch, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import useBaseAddress from 'hooks/useBaseAddress';
import fetch from 'isomorphic-fetch';
import localMessages from './BaseAddressForm.json';

export default {
  props: {
    address: {
      type: Object,
      required: false,
    },
  },
  components: {
    BaseInput,
    // BaseSelect,
  },
  setup(props, { emit }) {
    const { t } = useI18n({messages: localMessages});
    const { form, v } = useBaseAddress();

    const countries = ref([]);
    const selectedCountry = ref('');
    const isOpen = ref(false);
    const searchQuery = ref('');

    form.value.country = 'AU' // default country code

    const selectCountry = (country) => {
      selectedCountry.value = country;
      isOpen.value = false;
      form.value.country = country.code;
      v.value.country.$touch();
    }

    const toggleCountry = () => isOpen.value = !isOpen.value;

    const searchCountries = computed(() => {
      return countries.value.filter(country =>
        country.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    });
  
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        const data = await response.json(); 
        countries.value = data.map(country => ({
          name: country.name.common,
          code: country.cca2
        })).sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries(); 

    v.value.$touch();
    watch(
      form,
      (form) => {
        emit(
          'update-address',
          JSON.parse(JSON.stringify(form))
        );
      },
      { deep: true }
    );
    const validForm = computed(() => {
      return !v.value.$invalid;
    });
    watch(validForm, (validForm) => {
      emit('valid-form', validForm);
    });

    return { 
      t, 
      form, 
      validForm, 
      v, 
      countries, 
      selectedCountry, 
      selectCountry, 
      isOpen, 
      toggleCountry,
      searchQuery,
      searchCountries
    };
  },
};
