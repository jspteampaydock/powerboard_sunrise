export function paydockMapperDataHelper() {

    const paydockConvertAddress = (data) => {
        return {
            first_name: data?.firstName ?? null,
            last_name: data?.lastName ?? null,
            email: data?.email ?? null,
            phone: data?.phone ?? null,
            address_line1: data?.streetName ?? null,
            address_line2: data?.additionalStreetInfo ?? null,
            address_city: data?.city ?? null,
            address_country: data?.country ?? 'AU',
            address_postcode: data?.postalCode ?? null,
        };
    }

    const paydockConvertCartItems = (cartItems) => {
        if (cartItems?.length) {
            return cartItems.map((item) => {
                return {
                    name: item.name,
                    type: 'camera', //TODO: remove hardcode.
                    quantity: item.quantity,
                    item_uri: window.location.href.replace('checkout', "product/" + item.productSlug + "/" + item.variant?.sku),
                    image_uri: item.variant?.images[0]?.url,
                    amount: (item.price.value.centAmount / (10 ** item.price.value.fractionDigits))
                };
            });
        }

        return [];
    }

    return {
        paydockConvertAddress,
        paydockConvertCartItems,
    };
}
