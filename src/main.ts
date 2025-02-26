import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'

// PrimeVue components
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import FloatLabel from "primevue/floatlabel"
import Toolbar from "primevue/toolbar"
import ToggleSwitch from "primevue/toggleswitch"
import SelectButton from "primevue/selectbutton"
import StyleClass from "primevue/styleclass"
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import FileUpload from 'primevue/fileupload'
import Card from 'primevue/card'
import Avatar from 'primevue/avatar'
import Menubar from 'primevue/menubar'
import Sidebar from 'primevue/sidebar'
import Steps from 'primevue/steps'
import Chart from 'primevue/chart'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import ToggleButton from 'primevue/togglebutton'

// Tailwind CSS
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
          darkModeSelector: ".p-dark",
        },
    },
})
app.use(ToastService)

// Register components
app.component("Button", Button)
app.component("InputText", InputText)
app.component("FloatLabel", FloatLabel)
app.component("Toolbar", Toolbar)
app.component("ToggleSwitch", ToggleSwitch)
app.component("SelectButton", SelectButton)
app.component("Toast", Toast)
app.component("FileUpload", FileUpload)
app.component("Card", Card)
app.component("Avatar", Avatar)
app.component("Menubar", Menubar)
app.component("Sidebar", Sidebar)
app.component("Steps", Steps)
app.component("Chart", Chart)
app.component("DataTable", DataTable)
app.component("Column", Column)
app.component("Tag", Tag)
app.component("Divider", Divider)
app.component("ToggleButton", ToggleButton)
app.directive("styleclass", StyleClass)

app.mount('#app')
