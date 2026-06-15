import fluxPro from "./image/flux_pro";
import fluxSchnell from "./image/flux_schnell";
import sdxlLightning from "./image/sdxl_lightning";
import juggernautXL from "./image/juggernaut_xl";
import realvisXL from "./image/realvis_xl";
import dreamshaperXL from "./image/dreamshaper_xl";
import playgroundV25 from "./image/playground_v25";
import kandinsky3 from "./image/kandinsky_3";
import photonV1 from "./image/photon_v1";
import animeDiffusion from "./image/anime_diffusion";
import threeDRender from "./image/3d_render";
import cyberpunk from "./image/cyberpunk";
import pixarStyle from "./image/pixar_style";
import disneyStyle from "./image/disney_style";
import watercolor from "./image/watercolor";
import lineart from "./image/lineart";

// TODO: later we’ll import video, lipsync, tts, utility, nsfw models here

const image = [
  fluxPro,
  fluxSchnell,
  sdxlLightning,
  juggernautXL,
  realvisXL,
  dreamshaperXL,
  playgroundV25,
  kandinsky3,
  photonV1,
  animeDiffusion,
  threeDRender,
  cyberpunk,
  pixarStyle,
  disneyStyle,
  watercolor,
  lineart
];

const video = [];
const lipsync = [];
const tts = [];
const utility = [];
const nsfw = [];

export const models = {
  image,
  video,
  lipsync,
  tts,
  utility,
  nsfw
};
