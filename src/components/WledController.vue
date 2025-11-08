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
    <v-text-field
      v-model="selectedIp"
      label="Manual IP Entry"
      variant="outlined"
      density="compact"
      clearable
      hide-details="auto"
    />

    <v-divider class="my-3" />
    <v-select
      v-model="selectedDevice"
      :items="devices"
      item-title="name"
      label="Select WLED device"
      variant="outlined"
      density="compact"
      clearable
      return-object
      hide-details="auto"
      :disabled="loading || devices.length === 0"
    />

    <v-alert
      v-if="selectedIp"
      type="info"
      class="mt-4"
      border="start"
      color="blue-lighten-4"
      density="compact"
      :text="`IP: ${selectedIp}`"
    >
    </v-alert>
  </v-card>
  <v-card v-if="selectedIp" class="pa-4" elevation="2" rounded="xl">
    <v-switch label="OFF/ON" inset v-model="onState" hide-details="auto"></v-switch>
    <v-slider
      v-model="brightness"
      label="Brightness"
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
  </v-card>
  <v-card v-if="selectedIp" class="pa-4" elevation="2" rounded="xl">
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6">Phase 1 Presets:</span>
    </v-card-title>
    <v-slider
      v-model="phase1Intensity"
      label="Intensity"
      :color="phase1Color"
      :max="phase1Max"
      :min="phase1Min"
      class="align-center"
      hide-details
      step="1"
      tick-size="1"
    />
  </v-card>
  <v-card v-if="selectedIp" class="pa-4" elevation="2" rounded="xl">
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6">Phase 2 Presets:</span>
    </v-card-title>
    <v-slider
      v-model="phase2Intensity"
      label="Intensity"
      :color="phase2Color"
      :max="phase2Max"
      :min="phase2Min"
      class="align-center"
      hide-details
      step="1"
      tick-size="1"
    />
  </v-card>
  <v-card v-if="selectedIp" class="pa-4" elevation="2" rounded="xl">
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6">Advanced</span>
    </v-card-title>
    <v-color-picker
      v-model="selectedColor"
      mode="rgb"
      swatches-max-height="200"
      label="Pick a color"
    />
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
    <v-slider
      v-model="speed"
      label="Speed"
      :max="max"
      :min="min"
      class="align-center"
      hide-details
      step="1"
      tick-size="1">
      <template v-slot:append>
        <v-text-field
          v-model="speed"
          density="compact"
          style="width: 70px"
          type="number"
          hide-details
          single-line
        ></v-text-field>
      </template>
    </v-slider>

    <v-slider
      v-model="intensity"
      label="Intensity"
      :max="max"
      :min="min"
      class="align-center"
      hide-details
      step="1"
      tick-size="1">
      <template v-slot:append>
        <v-text-field
          v-model="intensity"
          density="compact"
          style="width: 70px"
          type="number"
          hide-details
          single-line
        ></v-text-field>
      </template>
    </v-slider>
  </v-card>
</template>

<script setup>
import { onMounted, ref, watch, computed, watchEffect } from 'vue';
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
const selectedDevice = ref(null);
const devices = ref([]);
const manualIp = ref(null);
const loading = ref(false);
const speed = ref(0);
const intensity = ref(0);
const selectedColor = ref(null);
const phase1Intensity = ref(null);
const phase1Min = ref(1);
const phase1Max = ref(13);
const phase1Color = ref(null);
const phase2Intensity = ref(null);
const phase2Min = ref(1);
const phase2Max = ref(9);
const phase2Color = ref(null);

const phase1Presets = [
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 1, ix: 1, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 1, ix: 64, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 1, ix: 128, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 1, ix: 192, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 1, ix: 255, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 64, ix: 255, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 128, ix: 255, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 192, ix: 255, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 21, sx: 255, ix: 255, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 22, sx: 255, ix: 64, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 22, sx: 255, ix: 128, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 22, sx: 255, ix: 192, pal: 0}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 22, sx: 255, ix: 255, pal: 0}], bri: 255 },
];
const phase2Presets = [
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 255, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 192, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 128, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 64, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 1, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 192, ix: 1, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 128, ix: 1, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 64, ix: 1, pal: 2}], bri: 255 },
  { seg: [{col:[[180, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 1, ix: 1, pal: 2}], bri: 255 },
];

const phase1Colors = [
  { color: "#00FF00" },
  { color: "#24FF00" },
  { color: "#48FF00" },
  { color: "#6CFF00" },
  { color: "#90FF00" },
  { color: "#B4FF00" },
  { color: "#D8FF00" },
  { color: "#FCFF00" },
  { color: "#FFF200" },
  { color: "#FFEB00" },
  { color: "#FFE300" },
  { color: "#FFDB00" },
  { color: "#FFD300" },
];

const phase2Colors = [
  { color: "#FFCB00" },
  { color: "#FFC300" },
  { color: "#FF9E00" },
  { color: "#FF7700" },
  { color: "#FF5000" },
  { color: "#FF2900" },
  { color: "#FF1200" },
  { color: "#F00000" },
  { color: "#A00000" }

];

const selectedIp = computed({
  get: () =>
    manualIp.value ||
    selectedDevice.value?.referer?.address ||
    selectedDevice.value?.host ||
    "",
  set: (val) => {
    manualIp.value = val; // decide what changing selectedIp should do
  },
});


// const selectedDevice?.referer?.address = "192.168.1.164"; // Replace with your WLED IP

// define throttled function
const updateBrightness = throttle(async (val) => {
  await axios.post(`http://${selectedIp.value}/json/state`, { bri: val, "psave": 1 });
  console.log("WLED brightness updated:", val);
}, 500); // only allow one request every 500ms

const updateSpeed = throttle(async (val) => {
  await axios.post(`http://${selectedIp.value}/json/state`, { seg: [{ sx: val }], "psave": 1 });
  console.log("WLED speed updated:", val);
}, 500); // only allow one request every 500ms

const updateIntensity = throttle(async (val) => {
  await axios.post(`http://${selectedIp.value}/json/state`, { seg: [{ ix: val }], "psave": 1 });
  console.log("WLED intensity updated:", val);
}, 500); // only allow one request every 500ms

const updateColor = throttle(async (color) => {
  await axios.post(`http://${selectedIp.value}/json/state`, {
    seg: [{
      col: [[color.r, color.g, color.b]]
    }],
    "psave": 1
  });
  console.log("WLED color updated:", color);
}, 500); // only allow one request every 500ms

const updatePhase1Intensity = debounce(async (val) => {
  const preset = phase1Presets[val - 1];
  if (!preset) return;
  await axios.post(`http://${selectedIp.value}/json/state`, { ...preset, "psave": 1 });
  fetchDeviceState();
}, 500); // debounce with 500ms delay

const updatePhase2Intensity = debounce(async (val) => {
  const preset = phase2Presets[val - 1];
  if (!preset) return;
  await axios.post(`http://${selectedIp.value}/json/state`, { ...preset, "psave": 1 });
  fetchDeviceState();

}, 500); // debounce with 500ms delay

const fetchDeviceState = async () => {
  try {
    const response = await axios.get(`http://${selectedIp.value}/json`);
    const data = response.data;

    console.log("Fetched WLED info:", data);

    //get all starting values and apply them to the reactive variables
    onState.value = data.state.on;
    brightness.value = data.state.bri;

    //get effects
    effects.value = data.effects
    .map((name, index) => ({ title: name, value: index }))
    .filter(e => e.title && e.title !== "RSVD");
    //get palettes
    palettes.value = data.palettes
    .map((name, index) => ({ title: name, value: index }))
    .filter(e => e.title && e.title !== "RSVD");    

    selectedEffect.value = data.state.seg[0].fx;
    selectedPalet.value = data.state.seg[0].pal;
    speed.value = data.state.seg[0].sx;
    intensity.value = data.state.seg[0].ix;
    selectedColor.value = {
      r: data.state.seg[0].col[0][0],
      g: data.state.seg[0].col[0][1],
      b: data.state.seg[0].col[0][2],
    };

    // console.log(`On: ${onState.value}`);
    // console.log(`Brightness: ${brightness.value}`);
    // console.log(`Effects: ${effects.value}`);
    // console.log(data)

    const currentPhase1Preset = phase1Presets.findIndex(preset => 
      JSON.stringify(preset.seg[0].col) === JSON.stringify(data.state.seg[0].col) &&
      preset.seg[0].fx === data.state.seg[0].fx &&
      preset.seg[0].sx === data.state.seg[0].sx &&
      preset.seg[0].ix === data.state.seg[0].ix &&
      preset.seg[0].pal === data.state.seg[0].pal
    );

    if (currentPhase1Preset !== -1) {
      phase1Intensity.value = currentPhase1Preset + 1; // Adjusting for 1-based index
    }

    const currentPhase2Preset = phase2Presets.findIndex(preset => 
      JSON.stringify(preset.seg[0].col) === JSON.stringify(data.state.seg[0].col) &&
      preset.seg[0].fx === data.state.seg[0].fx &&
      preset.seg[0].sx === data.state.seg[0].sx &&
      preset.seg[0].ix === data.state.seg[0].ix &&
      preset.seg[0].pal === data.state.seg[0].pal
    );

    if (currentPhase2Preset !== -1) {
      phase2Intensity.value = currentPhase2Preset + 1; // Adjusting for 1-based index
    }

  } catch (error) {
    console.error("Error fetching WLED info:", error);
  }
};

const refreshDevices = async () => {
  loading.value = true;
  try {
    devices.value = await window.wledAPI.getDevices();
    console.log("Devices refreshed:", devices.value);
    console.log("Selected Device:", selectedDevice.value);
  } catch (error) {
    console.error("Error refreshing devices:", error);
  } finally {
    loading.value = false;
  }
};

watch(devices, (newDevices) => {
  if(newDevices.length === 0){
    selectedDevice.value = null;
  }
});

watch(onState, async (newVal) => {
  if (newVal == null) return;
  await axios.post(`http://${selectedIp.value}/json/state`, { on: newVal });
});

watch(brightness, (newVal) => {
  if (newVal == null) return;
  updateBrightness(newVal);
});

watch(speed, async (newVal) => {
  if (newVal == null) return;
  updateSpeed(newVal);
});

watch(intensity, async (newVal) => {
  if (newVal == null) return;
  updateIntensity(newVal);
});

watch(selectedEffect, async (newVal) => {
  if (newVal == null) return;
  //check if the effects match with the existing effects, other wise do not send api call
  if (!effects.value.includes(selectedEffect.value)) return;
  await axios.post(`http://${selectedIp.value}/json/state`, { seg: [{ fx: newVal.value }], "psave": 1 });
  console.log("WLED effect updated:", newVal);
});

watch(selectedPalet, async (newVal) => {
  if (newVal == null) return;
  //check if the effects match with the existing effects, other wise do not send api call
  if (!palettes.value.includes(selectedPalet.value)) return;
  await axios.post(`http://${selectedIp.value}/json/state`, { seg: [{ pal: newVal.value }], "psave": 1 });
  console.log("WLED effect updated:", newVal);
});

watch(selectedColor, async (newColor) => {
  if (!newColor) return;
  updateColor(newColor);
});

watch(selectedDevice, async (newDevice) => {
  if (!newDevice) return;
  await fetchDeviceState();
});

watch(manualIp, async (newIp) => {
  if (!newIp || newIp.length < 8) return;
  await fetchDeviceState();
});

watch(phase1Intensity, async (newVal) => {
  if (newVal == null) return;
  phase1Color.value = phase1Colors[newVal - 1].color;
  phase2Intensity.value = null; //reset phase 1 when phase 2 is changed
  phase2Color.value = null;
  updatePhase1Intensity(newVal);

});

watch(phase2Intensity, async (newVal) => {
  if (newVal == null) return;
  phase2Color.value = phase2Colors[newVal - 1].color;
  phase1Intensity.value = null; //reset phase 1 when phase 2 is changed
  phase1Color.value = null;
  updatePhase2Intensity(newVal);
});

onMounted( async()=>{
  try{
    devices.value = await window.wledAPI.getDevices();
    window.wledAPI.onUpdate((newDevices) => {
      devices.value = newDevices;
    });
  }
  catch(error){
    console.error("Error fetching WLED state:", error.message);
  }
})

</script>
