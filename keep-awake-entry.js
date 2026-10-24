
import { KeepAwake } from "@capgo/capacitor-keep-awake";

window.metubeKeepAwake = {
    keepAwake: async () => {
        await KeepAwake.keepAwake();
    },

    allowSleep: async () => {
        await KeepAwake.allowSleep();
    }
};
