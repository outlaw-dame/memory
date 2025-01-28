import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vuesax from 'vuesax-alpha'
import VueSaxIcon from '@/components/VueSaxIcon.vue'
import { VsxIcon } from 'vue-iconsax'

import App from './App.vue'
import router from './router'

// Styles
import './assets/theme.css'
import './assets/style.scss'

const app = createApp(App).use(createPinia()).use(router).use(Vuesax)

app.component('vs-icon', VueSaxIcon)

app.mount('#app')
