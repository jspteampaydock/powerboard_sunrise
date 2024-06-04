import { ref } from 'vue';
import { required, email, maxLength, minLength} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

function useBaseAddress() {
  const form = ref({
    country: ''
  });

  const countryRequired = (value) => value !== 'Select country...';

  const rules = {
    firstName: { required, $lazy: true },
    lastName: { required, $lazy: true },
    streetName: { required, $lazy: true },
    additionalStreetInfo: {$lazy: true},
    postalCode: { required, maxLength: maxLength(6), minLength: minLength(4), $lazy: true },
    city: { required, maxLength: maxLength(24), $lazy: true },
    phone: { customRegex: value => /^\+?[1-9]\d{1,14}$/.test(value)},
    email: { required, email, $lazy: true },
    country: { required, countryRequired }
  };


  const v = useVuelidate(rules, form);
  return { form, v };
}
export default useBaseAddress;
