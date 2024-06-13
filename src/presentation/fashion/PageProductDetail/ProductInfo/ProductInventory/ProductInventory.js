import fetchWithToken from "@/apollo/auth";
import config from "../../../../../../sunrise.config";


async function getInventoryBySku(sku) {
    console.log(sku);
    const apiUrl = `${config.ct.api}/${config.ct.auth.projectKey}/inventory`;
    const queryParam = 'sku="' + sku + '"';
    const queryString = `?where=${encodeURIComponent(queryParam)}&limit=1`;
    console.log(apiUrl + queryString);

    try {
        let headers = {'Content-Type': 'application/json'};
        const option = {
            method: 'GET',
            headers: headers
        };
        const response = await fetchWithToken(apiUrl + queryString, option);
        const data = await response.json();
        if (response.ok) {
            if (data.results.length > 0) {
                if(data.results[0].sku == sku) {
                    return 'Available product: ' + data.results[0].quantityOnStock;
                }else{
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

export default {
    props: ['sku'],
    data(){
        return {
            InventoryBySku: '',
        };
    },
    async mounted() {

        this.InventoryBySku = await getInventoryBySku(this.sku)
    }
};

