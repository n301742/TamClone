<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { addressBookService } from '../../services/api';
import type { Address, CreateAddressRequest, UpdateAddressRequest } from '../../services/api';

// Services
const toast = useToast();

// State
const addresses = ref<Address[]>([]);
const loading = ref(true);
const addressDialog = ref(false);
const deleteAddressDialog = ref(false);
const selectedAddress = ref<Address | null>(null);
const isEdit = ref(false);
const submitted = ref(false);

// Form state
const addressForm = reactive<CreateAddressRequest | UpdateAddressRequest>({
  name: '',
  company: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false
});

// Reset form
const resetForm = () => {
  addressForm.name = '';
  addressForm.company = '';
  addressForm.streetAddress = '';
  addressForm.city = '';
  addressForm.state = '';
  addressForm.postalCode = '';
  addressForm.country = '';
  addressForm.isDefault = false;
  submitted.value = false;
};

// Open address dialog for new address
const openNewAddressDialog = () => {
  resetForm();
  isEdit.value = false;
  addressDialog.value = true;
};

// Open address dialog for editing
const openEditAddressDialog = (address: Address) => {
  resetForm();
  isEdit.value = true;
  selectedAddress.value = address;
  
  // Fill form with address data
  addressForm.name = address.name;
  addressForm.company = address.company || '';
  addressForm.streetAddress = address.streetAddress;
  addressForm.city = address.city;
  addressForm.state = address.state || '';
  addressForm.postalCode = address.postalCode;
  addressForm.country = address.country;
  addressForm.isDefault = address.isDefault;
  
  addressDialog.value = true;
};

// Hide address dialog
const hideAddressDialog = () => {
  addressDialog.value = false;
  submitted.value = false;
};

// Confirm address deletion
const confirmDeleteAddress = (address: Address) => {
  selectedAddress.value = address;
  deleteAddressDialog.value = true;
};

// Hide delete confirmation dialog
const hideDeleteAddressDialog = () => {
  deleteAddressDialog.value = false;
};

// Save new or updated address
const saveAddress = async () => {
  submitted.value = true;
  
  // Form validation
  if (!addressForm.name || !addressForm.streetAddress || !addressForm.city || !addressForm.postalCode || !addressForm.country) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields', life: 3000 });
    return;
  }
  
  try {
    if (isEdit.value && selectedAddress.value) {
      // Update existing address
      await addressBookService.updateAddress(selectedAddress.value.id, addressForm);
      toast.add({ severity: 'success', summary: 'Success', detail: 'Address updated successfully', life: 3000 });
    } else {
      // Create new address
      await addressBookService.createAddress(addressForm as CreateAddressRequest);
      toast.add({ severity: 'success', summary: 'Success', detail: 'Address created successfully', life: 3000 });
    }
    
    hideAddressDialog();
    fetchAddresses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save address. Please try again.',
      life: 5000
    });
  }
};

// Delete address
const deleteAddress = async () => {
  if (!selectedAddress.value) return;
  
  try {
    await addressBookService.deleteAddress(selectedAddress.value.id);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Address deleted successfully', life: 3000 });
    hideDeleteAddressDialog();
    fetchAddresses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to delete address. Please try again.',
      life: 5000
    });
  }
};

// Set address as default
const setAsDefault = async (address: Address) => {
  if (address.isDefault) return;
  
  try {
    await addressBookService.setDefaultAddress(address.id, true);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Default address updated', life: 3000 });
    fetchAddresses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update default address. Please try again.',
      life: 5000
    });
  }
};

// Fetch addresses from API
const fetchAddresses = async () => {
  loading.value = true;
  try {
    addresses.value = await addressBookService.getAddresses();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to fetch addresses. Please try again.',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

// Format full address for display
const getFullAddress = (address: Address) => {
  let parts = [address.streetAddress, address.city];
  
  if (address.state) {
    parts.push(address.state);
  }
  
  parts.push(address.postalCode);
  parts.push(address.country);
  
  return parts.join(', ');
};

// Initialize component
onMounted(() => {
  fetchAddresses();
});
</script>

<template>
  <div>
    <div class="card mb-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">My Address Book</h1>
        <Button label="Add New Address" icon="pi pi-plus" @click="openNewAddressDialog" />
      </div>

      <DataTable :value="addresses" :loading="loading" paginator :rows="10" 
               emptyMessage="No addresses found. Add your first address by clicking the 'Add New Address' button."
               stripedRows class="p-datatable-addresses">
        <Column field="name" header="Name" :sortable="true">
          <template #body="{ data }">
            <div>
              <span class="font-medium">{{ data.name }}</span>
              <Badge v-if="data.isDefault" severity="info" value="Default" class="ml-2" />
            </div>
            <div v-if="data.company" class="text-surface-600 dark:text-surface-400 text-sm">
              {{ data.company }}
            </div>
          </template>
        </Column>
        
        <Column field="address" header="Address" :sortable="false">
          <template #body="{ data }">
            <div>{{ getFullAddress(data) }}</div>
          </template>
        </Column>
        
        <Column field="actions" header="Actions">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-pencil" severity="info" text rounded aria-label="Edit Address"
                     @click="openEditAddressDialog(data)" />
              
              <Button v-if="!data.isDefault" icon="pi pi-star" severity="warning" text rounded aria-label="Set as Default"
                     @click="setAsDefault(data)" />
              
              <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Delete Address"
                     @click="confirmDeleteAddress(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Address Dialog -->
    <Dialog v-model:visible="addressDialog" 
           :header="isEdit ? 'Edit Address' : 'Add New Address'" 
           :style="{ width: '500px' }" modal class="p-fluid">
      <div class="field">
        <label for="name" class="font-medium">Name *</label>
        <InputText id="name" v-model="addressForm.name" :class="{ 'p-invalid': submitted && !addressForm.name }" 
                  placeholder="Contact name" />
        <small class="p-error" v-if="submitted && !addressForm.name">Name is required.</small>
      </div>
      
      <div class="field">
        <label for="company" class="font-medium">Company</label>
        <InputText id="company" v-model="addressForm.company" placeholder="Company name (optional)" />
      </div>
      
      <div class="field">
        <label for="streetAddress" class="font-medium">Street Address *</label>
        <InputText id="streetAddress" v-model="addressForm.streetAddress" 
                  :class="{ 'p-invalid': submitted && !addressForm.streetAddress }" 
                  placeholder="Street address" />
        <small class="p-error" v-if="submitted && !addressForm.streetAddress">Street address is required.</small>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div class="field">
          <label for="city" class="font-medium">City *</label>
          <InputText id="city" v-model="addressForm.city" 
                    :class="{ 'p-invalid': submitted && !addressForm.city }" 
                    placeholder="City" />
          <small class="p-error" v-if="submitted && !addressForm.city">City is required.</small>
        </div>
        
        <div class="field">
          <label for="state" class="font-medium">State/Province</label>
          <InputText id="state" v-model="addressForm.state" placeholder="State or province (optional)" />
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div class="field">
          <label for="postalCode" class="font-medium">Postal Code *</label>
          <InputText id="postalCode" v-model="addressForm.postalCode" 
                    :class="{ 'p-invalid': submitted && !addressForm.postalCode }" 
                    placeholder="Postal code" />
          <small class="p-error" v-if="submitted && !addressForm.postalCode">Postal code is required.</small>
        </div>
        
        <div class="field">
          <label for="country" class="font-medium">Country *</label>
          <InputText id="country" v-model="addressForm.country" 
                    :class="{ 'p-invalid': submitted && !addressForm.country }" 
                    placeholder="Country" />
          <small class="p-error" v-if="submitted && !addressForm.country">Country is required.</small>
        </div>
      </div>
      
      <div class="field-checkbox">
        <Checkbox id="isDefault" v-model="addressForm.isDefault" :binary="true" />
        <label for="isDefault" class="ml-2 cursor-pointer">Set as default address</label>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="hideAddressDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveAddress" />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog 
      v-model:visible="deleteAddressDialog"
      header="Confirm Delete" 
      icon="pi pi-exclamation-triangle"
      message="Are you sure you want to delete this address?" 
      acceptClass="p-button-danger" 
      acceptLabel="Yes, Delete"
      rejectLabel="Cancel"
      @accept="deleteAddress">
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg;
}
</style> 