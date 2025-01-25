<script setup lang="ts"></script>

<template>
  <div class="welcome grid h-full grid-rows-[fit-content(100%)_auto] items-stretch">
    <div>
      <div class="background">
        <div id="topRightCircle" />
        <div id="bottomCircle" />
        <div id="bottomRightCircle" />
        <div id="bottomLeftCircle" />
        <div id="topLeftCircle" />
      </div>
    </div>
    <div class="self-end">
      <div class="text-white">
        <h2 class="text-h1 pb-(--gap-default)">
          Welcome to<br /><span class="text-pageTitle font-[Butler]">LOGO.</span>
        </h2>
        <p class="text-h3 pb-(--padding-huge)">
          The most customisable social app you’ve ever experienced, in the palm of your hand.
        </p>
      </div>
      <div class="gap-(--gap-default) flex flex-col">
        <vs-button class="text-dark w-full bg-white" success @click="$router.push({ name: 'signin' })">
          Sign in
        </vs-button>
        <vs-button class="bg-white-20 w-full text-white" success @click="$router.push({ name: 'signup' })">
          Sign up
        </vs-button>
      </div>
      <div class="py-(--padding-large) gap-(--gap-default) mb-6 flex justify-center">
        <p>Terms of Service</p>
        <p>Imprint</p>
        <p>About</p>
      </div>
    </div>
  </div>
</template>
