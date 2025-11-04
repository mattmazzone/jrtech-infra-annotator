<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MailWarning, LogOut } from 'lucide-vue-next'

const { user, isAuthenticated, isLoading, logout } = useAuth0()

const showVerificationWarning: Ref<boolean> = ref(false)
const countdown: Ref<number> = ref(15)
let countdownInterval: number | null = null

watch([isAuthenticated, isLoading, user], () => {
  if (!isLoading.value && isAuthenticated.value && user.value) {
    if (!user.value.email_verified) {
      showVerificationWarning.value = true
      countdown.value = 15

      // Start countdown
      countdownInterval = window.setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(countdownInterval!)
          handleLogout()
        }
      }, 1000)
    }
  }
})

const handleLogout = (): void => {
  if (countdownInterval) clearInterval(countdownInterval)
  logout({ logoutParams: { returnTo: window.location.origin + '/jrtech-infra-annotator/' } })
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="showVerificationWarning"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <Transition name="slide-up" appear>
        <div
          class="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6 space-y-5"
        >
          <div class="flex items-center space-x-3">
            <div
              class="h-10 w-10 flex items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <MailWarning class="h-5 w-5" />
            </div>
            <AlertTitle class="text-lg font-semibold"> Verify Your Email </AlertTitle>
          </div>

          <AlertDescription class="text-sm text-muted-foreground leading-relaxed">
            <p>
              We've sent a verification email to
              <span class="font-medium text-foreground">{{ user?.email }}</span
              >.
            </p>
            <p class="mt-1">Please verify your email to continue using the application.</p>
          </AlertDescription>

          <div class="flex items-center justify-between border-t border-border pt-4">
            <p class="text-xs text-muted-foreground">Logging out in {{ countdown }}s</p>
            <Button
              variant="destructive"
              size="sm"
              class="gap-2 rounded-full px-3"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              Logout Now
            </Button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <router-view v-if="!showVerificationWarning" />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
</style>
