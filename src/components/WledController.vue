<template>
    <v-card class="pa-4" elevation="2" rounded="xl">
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6">WLED Devices</span>

      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-refresh"
        @click="refreshDevices"
        :loading="loading"
      >
        Refresh
      </v-btn>
    </v-card-title>

    <v-divider class="my-3" />

    <v-select
      v-model="selectedIp"
      :items="devices"
      item-title="name"
      item-value="ip"
      label="Select WLED device"
      variant="outlined"
      density="comfortable"
      clearable
      :disabled="loading || devices.length === 0"
    >
      <template #no-data>
        <v-list-item>
          <v-list-item-title>
            {{ loading ? 'Searching for devices…' : 'No devices found' }}
          </v-list-item-title>
        </v-list-item>
      </template>
    </v-select>

    <v-alert
      v-if="selectedIp"
      type="info"
      class="mt-4"
      border="start"
      color="blue-lighten-4"
      title="Selected Device"
    >
      <div class="font-medium">
        {{ getDeviceName(selectedIp) }} ({{ selectedIp }})
      </div>
    </v-alert>
  </v-card>
  <v-switch label="OFF/ON" inset v-model="onState"></v-switch>
  <v-slider
    v-model="brightness"
    :max="max"
    :min="min"
    class="align-center"
    hide-details
    step="1"
    tick-size="1"
  >
    <template v-slot:append>
      <v-text-field
        v-model="brightness"
        density="compact"
        style="width: 70px"
        type="number"
        hide-details
        single-line
      ></v-text-field>
    </template>
  </v-slider>
  <v-combobox
    label="Effect"
    v-model="selectedEffect"
    :items="effects"
    item-title="title"
    item-value="value"
    variant="outlined"
  />
  <v-combobox
    label="Pallet"
    v-model="selectedPalet"
    :items="palettes"
    item-title="title"
    item-value="value"
    variant="outlined"
  />
</template>

<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import axios from 'axios'
import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';


//define reactive variables
const initialized = ref(false);
const onState = ref(false);
const min = ref(0);
const max = ref(255);
const brightness = ref(1);
const effects = ref([]);
const selectedEffect = ref();
const palettes = ref([]);
const selectedPalet = ref();
const selectedIp = ref('');
const devices = ref([]);

const wledIp = "192.168.1.164"; // Replace with your WLED IP

// define throttled function
const updateBrightness = throttle(async (val) => {
  await axios.post(`http://${wledIp}/json/state`, { bri: val });
  console.log("WLED brightness updated:", val);
}, 500); // only allow one request every 300ms

watch(onState, async (newVal) => {
  if (newVal == null) return;
  await axios.post(`http://${wledIp}/json/state`, { on: newVal });
  console.log("WLED state updated:", newVal);
});

watch(brightness, (newVal) => {
  if (newVal == null) return;
  updateBrightness(newVal);
});

watch(selectedEffect, async (newVal) => {
  if (newVal == null) return;
  //check if the effects match with the existing effects, other wise do not send api call
  if (!effects.value.includes(selectedEffect.value)) return;
  await axios.post(`http://${wledIp}/json/state`, { seg: [{ fx: newVal.value }] });
  console.log("WLED effect updated:", newVal);
});

watch(selectedPalet, async (newVal) => {
  if (newVal == null) return;
  //check if the effects match with the existing effects, other wise do not send api call
  if (!palettes.value.includes(selectedPalet.value)) return;
  await axios.post(`http://${wledIp}/json/state`, { seg: [{ pal: newVal.value }] });
  console.log("WLED effect updated:", newVal);
});

onMounted( async()=>{
  try{
    const response = await axios.get(`http://${wledIp}/json`)

    const data = response.data;

    //get all starting values and apply them to the reactive variables
    onState.value = data.state.on;
    brightness.value = data.state.bri;
    effects.value = data.effects
    .map((name, index) => ({ title: name, value: index }))
    .filter(e => e.title && e.title !== "RSVD");

    palettes.value = data.palettes
    .map((name, index) => ({ title: name, value: index }))
    .filter(e => e.title && e.title !== "RSVD");

    selectedEffect.value = data.state.seg[0].fx;
    selectedPalet.value = data.state.seg[0].pal;

    console.log(`On: ${onState.value}`);
    console.log(`Brightness: ${brightness.value}`);
    console.log(`Effects: ${effects.value}`);
    console.log(data)

    
  }
  catch(error){
    console.error("Error fetching WLED state:", error.message);
  }
})

</script>
