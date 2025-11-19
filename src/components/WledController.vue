<template>
  <v-container v-show="!disableControls">
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
      <v-switch label="Sync all" inset v-model="syncAllState" hide-details="auto"></v-switch>
      <v-switch label="Seg Only (no brightness)" v-if="syncAllState" inset v-model="syncSegmentOnly" hide-details="auto"></v-switch>
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
        <span class="text-h6">Portal Distortion:</span>
      </v-card-title>
      <v-slider
        v-model="portalDistortionIntensity"
        label="Intensity"
        :color="portalDistortionColor"
        :max="portalDistortionMax"
        :min="portalDistortionMin"
        class="align-center"
        hide-details
        step="1"
        tick-size="1"
      />
    </v-card>
    <v-card v-if="selectedIp" class="pa-4" elevation="2" rounded="xl">
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6">Quick Effects:</span>
      </v-card-title>
      <v-button-group>
        <v-btn
          v-for="(quickEffect, index) in quickEffects"
          :key="index"
          @click="runQuickEffect(quickEffect.preset, quickEffect.timeout)"
        >
          {{ quickEffect.name }}
        </v-btn>
      </v-button-group>
      <v-text-field
        v-model="manualEffectDuration"
        type="number"
        label="Overwrite standard effect duration (ms)"
        :step="1000"
        hide-details="auto"
        clearable
      ></v-text-field>
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
  </v-container>
  <v-container v-show="disableControls" class="my-4">
    <v-alert type="info" border="start" color="blue-lighten-4" density="comfortable">
      {{ disableControlsMessage }}
    </v-alert>
    <v-switch
    v-model="disableControls"
    hide-details="auto"
    inset
  >
    <!-- Slot for the thumb (the part you drag) -->
    <template #thumb>
      <v-icon>{{ disableControls ? 'mdi-lock' : 'mdi-lock-open' }}</v-icon>
    </template>
  </v-switch>
  </v-container>
</template>

<script setup>
import { onMounted, ref, watch, computed, onUnmounted } from 'vue';
import axios from 'axios'
import debounce from 'lodash.debounce';
import throttle from 'lodash.throttle';
import _ from 'lodash';
import { ru } from 'vuetify/locale';


//define reactive variables
const initialized = ref(false);
const onState = ref(false);
const liveState = ref(null);
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
const allIps = ref([]);
const loading = ref(false);
const speed = ref(0);
const intensity = ref(0);
const selectedColor = ref(null);
const portalDistortionIntensity = ref(null);
const portalDistortionMin = ref(1);
const portalDistortionMax = ref(5);
const portalDistortionColor = ref(null);
const syncAllState = ref(false);
const syncSegmentOnly = ref(true);
const websocket = ref(null);
const disableControls = ref(false);
const disableControlsMessage = ref("");
const manualEffectDuration = ref(null);

const portalDistortionPresets = [
  { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 1, ix: 128, pal: 2}] },
  { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 100, ix: 128, pal: 2}] },
  { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 150, ix: 128, pal: 2}] },
  { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 200, ix: 128, pal: 2}] },
  { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 80, sx: 255, ix: 128, pal: 2}] },
];

const portalDistortionColors = [
  { color: "#66BB6A" }, // Green
  { color: "#FFD54F" }, // Yellow
  { color: "#FF9800" }, // Orange
  { color: "#F44336" }, // Red
  { color: "#B71C1C" }  // Deep Red
];


const quickEffects = [
  {name: "Large distortion", timeout: 10000, preset: { seg: [{col:[[255, 0, 0],[0, 0, 0],[0, 0, 0]], fx: 129, sx: 255, ix: 255, pal: 0}], bri: 255 }},
  {name: "Lightning explosion", timeout: 7500, preset: { seg: [{col:[[255, 255, 150],[0, 0, 0],[0, 0, 0]], fx: 57, sx: 240, ix: 200, pal: 0}], bri: 255 }},
  {name: "Portal Restart", timeout: 30000, preset: { seg: [{col:[[0, 0, 255],[0, 0, 0],[0, 0, 0]], fx: 44, sx: 0, ix: 0, pal: 11}], bri: 255 }},
]

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

const setWebsocket = (wledIp) => {
  websocket.value = new WebSocket(`ws://${wledIp}/ws`);
  websocket.value.onopen = () => {
  console.log("WLED WebSocket connected");
  websocket.value.send('{"lv":true}');
};

  websocket.value.onmessage = event => {
    const msg = JSON.parse(event.data);

    console.log("WLED WebSocket message received:", msg);
    // WLED sends multiple types of packets; state updates include "state"
    if (msg.state) {
      liveState.value = msg.state;
    }
  };

  websocket.value.onopen = () => console.log("WLED WebSocket connected");
  websocket.value.onerror = e => console.error("WLED WebSocket error", e);
};

const sendPostRequest = async (endpoint, data) => {
  try {
    if (syncAllState.value) {
      const currentDevices = await window.wledAPI.getDevices();
      allIps.value = currentDevices.map(device => device.referer?.address);

      const requests = allIps.value.map(ip => {
        let requestData = { ...data }; // clone to avoid mutation

        // Sanitize seg
        requestData.seg = requestData.seg?.map(seg => {
          const sanitizedSeg = {};
          if (seg.fx !== undefined) sanitizedSeg.fx = seg.fx;
          if (seg.sx !== undefined) sanitizedSeg.sx = seg.sx;
          if (seg.ix !== undefined) sanitizedSeg.ix = seg.ix;
          if (seg.pal !== undefined) sanitizedSeg.pal = seg.pal;
          if (seg.col !== undefined) sanitizedSeg.col = seg.col;
          return sanitizedSeg;
        });

        if (syncSegmentOnly.value) {
          const { seg, on, psave } = requestData;
          requestData = { seg, on, psave };
        } else {
          const { bri, on, seg, psave } = requestData;
          requestData = { bri, on, seg, psave };
        }

        return axios.post(`http://${ip}${endpoint}`, requestData);
        // or use your helper:
        // return sendPostRequest(`http://${ip}${endpoint}`, requestData);
      });

      await Promise.all(requests);
    }
    else {
      const response = await axios.post(`http://${selectedIp.value}${endpoint}`, data);
      return response.data;
    }
  } catch (error) {
    console.error(`Error sending POST request to ${endpoint}:`, error);
    throw error;
  }
};

// define throttled function
const updateBrightness = throttle(async (val) => {
  await sendPostRequest('/json/state', { bri: val, psave: 1 });
  console.log("WLED brightness updated:", val);
}, 500);

const updateSpeed = throttle(async (val) => {
  await sendPostRequest('/json/state', { seg: [{ sx: val }], psave: 1 });
  console.log("WLED speed updated:", val);
}, 500);

const updateIntensity = throttle(async (val) => {
  await sendPostRequest('/json/state', { seg: [{ ix: val }], psave: 1 });
  console.log("WLED intensity updated:", val);
}, 500);

const updateColor = throttle(async (color) => {
  await sendPostRequest('/json/state', {
    seg: [{ col: [[color.r, color.g, color.b]] }],
    psave: 1
  });
  console.log("WLED color updated:", color);
}, 500);

const updateportalDistortionIntensity = debounce(async (val) => {
  const preset = portalDistortionPresets[val - 1];
  if (!preset) return;
  await sendPostRequest('/json/state', { ...preset, psave: 1 });
  fetchDeviceJson();
}, 500);

const fetchDeviceState = async () => {
  try {
    const response = await axios.get(`http://${selectedIp.value}/json/state`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WLED state:", error);
    return null;
  }
};

const fetchDeviceJson = async () => {
  try {
    const response = await axios.get(`http://${selectedIp.value}/json`);
    const data = response.data;

    console.log("Fetched WLED info:", data);

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
    speed.value = data.state.seg[0].sx;
    intensity.value = data.state.seg[0].ix;
    selectedColor.value = {
      r: data.state.seg[0].col[0][0],
      g: data.state.seg[0].col[0][1],
      b: data.state.seg[0].col[0][2],
    };

    const currentportalDistortionPreset = portalDistortionPresets.findIndex(preset =>
      JSON.stringify(preset.seg[0].col) === JSON.stringify(data.state.seg[0].col) &&
      preset.seg[0].fx === data.state.seg[0].fx &&
      preset.seg[0].sx === data.state.seg[0].sx &&
      preset.seg[0].ix === data.state.seg[0].ix &&
      preset.seg[0].pal === data.state.seg[0].pal
    );

    if (currentportalDistortionPreset !== -1) {
      portalDistortionIntensity.value = currentportalDistortionPreset + 1;
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

const runQuickEffect = async (preset, timeout) => {
  try {
    const currentPreset = await fetchDeviceState();
    await sendPostRequest('/json/state', { ...preset });
    
    if(manualEffectDuration.value){
      timeout = parseInt(manualEffectDuration.value);
    }
    await sleep(timeout);
    await sendPostRequest('/json/state', { ...currentPreset, psave: 1 });
  } catch (error) {
    console.error("Error applying quick effect:", error);
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

watch(devices, (newDevices) => {
  if (newDevices.length === 0) {
    selectedDevice.value = null;
  }
});

watch(onState, async (newVal) => {
  if (newVal == null) return;
  await sendPostRequest('/json/state', { on: newVal });
});

watch(brightness, (newVal) => {
  if (newVal == null) return;
  updateBrightness(newVal);
});

watch(speed, (newVal) => {
  if (newVal == null) return;
  updateSpeed(newVal);
});

watch(intensity, (newVal) => {
  if (newVal == null) return;
  updateIntensity(newVal);
});

watch(selectedEffect, async (newVal) => {
  if (newVal == null) return;
  if (!effects.value.includes(selectedEffect.value)) return;
  await sendPostRequest('/json/state', { seg: [{ fx: newVal.value }], psave: 1 });
  console.log("WLED effect updated:", newVal);
});

watch(selectedPalet, async (newVal) => {
  if (newVal == null) return;
  if (!palettes.value.includes(selectedPalet.value)) return;
  await sendPostRequest('/json/state', { seg: [{ pal: newVal.value }], psave: 1 });
  console.log("WLED palette updated:", newVal);
});

watch(selectedColor, (newColor) => {
  if (!newColor) return;
  updateColor(newColor);
});

watch(selectedDevice, async (newDevice) => {
  if (!newDevice) return;
  await fetchDeviceJson();
});

watch(manualIp, async (newIp) => {
  if (!newIp || newIp.length < 8) return;
  await fetchDeviceJson();
});

watch(portalDistortionIntensity, (newVal) => {
  if (newVal == null) return;
  portalDistortionColor.value = portalDistortionColors[newVal - 1].color;
  updateportalDistortionIntensity(newVal);
});

watch(selectedIp, (ip) => {
  if (!ip || ip.length < 7) return;
  console.log("Connecting WebSocket:", ip);
  setWebsocket(ip);
});

watch(liveState, (newState) => {
  if (!newState) return;

  const matchedEffect = quickEffects.find(effect =>
    _.isMatch(newState, effect.preset)
  );

  if (matchedEffect) {
    console.log(`Live state matches ${matchedEffect.name} effect.`);
    disableControlsMessage.value = `Controls disabled: ${matchedEffect.name} effect is active.`;
    disableControls.value = true;
  } 
  else {
    disableControls.value = false;
  }
});

onMounted(async () => {
  try {
    devices.value = await window.wledAPI.getDevices();
    window.wledAPI.onUpdate((newDevices) => {
      devices.value = newDevices;
    });
  } catch (error) {
    console.error("Error fetching WLED state:", error.message);
  }
});

onUnmounted(() => {
  if (websocket.value){
    websocket.value.close();
  }
});

</script>
