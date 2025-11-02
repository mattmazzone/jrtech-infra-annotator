import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { createAuth0 } from '@auth0/auth0-vue'
import './index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const auth0 = createAuth0({
  domain: 'dev-ighikkkuy7psftc7.us.auth0.com',
  clientId: 'KTTYtiTjU78ca3BNgUCvY8VOZDVoD5vf',
  authorizationParams: {
    redirect_uri: window.location.origin + '/jrtech-infra-annotator/',
  },
  useRefreshTokens: true, // Enable refresh tokens
  cacheLocation: 'localstorage', // Persist auth state across refreshes
})

app.use(auth0)
app.use(createPinia())
app.use(router)

app.mount('#app')
