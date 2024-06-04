<script src="./BaseAddressForm.js"></script>

<template>
  <div class="row">
    <div class="col-lg-6 col-md-6 mb-20">
      <div class="billing-info">
        <label>
          {{ t('firstName') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.firstName.$model"
          type="text"
          data-test="address-form-firstName"
        />
        <div
          class="error-field"
          v-for="error of v.firstName.$silentErrors"
          :key="error.$message"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 mb-20">
      <div class="billing-info">
        <label>
          {{ t('lastName') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.lastName.$model"
          type="text"
          data-test="address-form-lastName"
        />
        <div
          class="error-field"
          v-for="error of v.lastName.$silentErrors"
          :key="error.$message"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>

    <div class="col-lg-12 mb-20">
      <div class="billing-info pb-0">
        <div class="mb-10 country">
          <label>
            {{ t('country') }}
            <abbr class="required" title="required">*</abbr>
          </label>
          <div :class="['select-country', { '-open': isOpen }]">
            <div 
              class="select-value" 
              @click="toggleCountry" 
              :data-code="selectedCountry ? selectedCountry.code : 'AU'"
            >
              {{ selectedCountry ? selectedCountry.name : 'Australia' }}
            </div>
            <div class="select-dropdown"> 
              <div class="select-search">
                  <input 
                    v-model="searchQuery"
                    type="text" 
                    autocomplete="off" 
                    placeholder="Search..."
                  >
                  <div class="error" :class="{ '-show': searchCountries.length === 0 }">{{ t('noResults') }}</div>
              </div> 
              <ul>
                <li
                  v-for="country in searchCountries"
                  :key="country.name"
                  @click="selectCountry(country)"
                  :class="{ 'selected': selectedCountry === country }"
                  :data-code="country.code" 
                >
                  {{ country.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          class="error-field"
          v-for="error of v.country.$silentErrors"
          :key="error.$message"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>

    <div class="col-lg-12 mb-20">
      <div class="billing-info pb-0">
        <div class="mb-10 address">
          <label>
            {{ t('address') }}
            <abbr class="required" title="required">*</abbr>
          </label>
          <input
            class="billing-address"
            v-model="v.streetName.$model"
            :placeholder="t('streetName')"
            type="text"
            data-test="address-form-streetName"
          />
          <div
            class="error-field"
            v-for="error of v.streetName.$silentErrors"
            :key="error.$message"
          >
            <div>{{ error.$message }}</div>
          </div>
        </div>
        <div class="address">
          <input
            v-model="form.additionalStreetInfo"
            :placeholder="t('additional')"
            type="text"
            data-test="address-form-additionalStreetInfo"
          />
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 mb-20">
      <div class="billing-info">
        <label>
          {{ t('postCode') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.postalCode.$model"
          type="text"
          data-test="address-form-postalCode"
        />
        <div
          class="error-field"
          v-for="error of v.postalCode.$silentErrors"
          :key="error.$message"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 mb-20">
      <div class="billing-info">
        <label>
          {{ t('city') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.city.$model"
          type="text"
          data-test="address-form-city"
        />
        <div
          class="error-field"
          v-for="error of v.city.$silentErrors"
          :key="error.$message"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>
    <div class="col-lg-12 mb-20" style="display: none">
      <div class="billing-select">
        <label>
          {{ t('country') }}
          <abbr class="required" title="required">*</abbr>
        </label>
      </div>
    </div>
    <div class="col-lg-6 col-md-6 mb-20">
      <div class="billing-info">
        <label>
          {{ t('phone') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.phone.$model"
          type="tel"
          data-test="address-form-phone"
        />
        <div
            class="error-field"
            v-for="error of v.phone.$silentErrors"
            :key="error.$message"
        >
          <div> Phone number format (should start with + and contain digits only)</div>
        </div>
      </div>
    </div>
    <div class="col-lg-6 col-md-6">
      <div class="billing-info">
        <label>
          {{ t('email') }}
          <abbr class="required" title="required">*</abbr>
        </label>
        <input
          v-model="v.email.$model"
          type="email"
          data-test="address-form-email"
        />
        <div
          v-for="error of v.email.$silentErrors"
          :key="error.$message"
          class="error-field"
        >
          <div>{{ error.$message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
