const B_PROTOCOL_ADDRESS = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut';
const MAP_PROTOCOL_ADDRESS = '1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5';
const AIP_PROTOCOL_ADDRESS = '15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva';
const BAP_PROTOCOL_ADDRESS = '1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT';
const BPP_PROTOCOL_ADDRESS = 'BPP';
const P2PKH_SIGSCRIPT_SIZE = 1 + 73 + 1 + 33;
const P2PKH_OUTPUT_SIZE = 8 + 1 + 1 + 1 + 1 + 20 + 1 + 1;
const P2PKH_INPUT_SIZE = 36 + 1 + P2PKH_SIGSCRIPT_SIZE + 4;
const PUB_KEY_SIZE = 66;
const FEE_PER_KB = 1;
const FEE_FACTOR = (FEE_PER_KB / 1000);
const APP = 'retrofeed.me';
const urlRegex = /(https?:\/\/[^\s]+)/g;
const youRegex = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;
const tagRegex = /@[A-Za-z0-9_-]*/g;
const hashtagRegex = /#[A-Za-z0-9_-]*/g;
const TEST_PUBLIC_ENCRYPTION_KEY = '023c302b01e42c6f6e7cd8811c3a7065b0c2579845b14f272c3517eac95b5d658b';
const PROD_PUBLIC_ENCRYPTION_KEY = '';
const RUN_DB_HOST = 'http://localhost:9004';
const B_CONTRACT = '05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o3';
const api = 'run';
const trustlist = [
    'ce8629aa37a1777d6aa64d0d33cd739fd4e231dc85cfe2f9368473ab09078b78',
    '352d3f68aeac4b912bc31f24c98d171229f99137b97a26824aeb62d32f774c2c',
    'cdea2c203af755cd9477ca310c61021abaafc135a21d8f93b8ebfc6ca5f95712',
    '23fc8a6dd8f0c2f46459a5911e0482cf77496548cbd4df227ebaf8de83a99cd7',
    '84e20d29a122c6c3ad3776cc16c049d196fa28f9447b0745053d2b9ea9c0ff11',
    'f4309344dfb27e3b556880d86054d298ef111193415a6dd97a5f04f6c3ec1c56',
    'c5b222fbf9cf0b5aeb2a00e968c9d1cb492d184bf85a74a3301d7ea5e26444b9',
    'c07294f0a15db4c842f24ecceaea84d7eae226f76e34af0bc42733b020f2c7ad',
    'b001aff74d723e12dbee345db6635b4b27d8b2dc617cf3e68ff50569e041987d'
];
const RELAYONE_PREFIX = '1REtR5tQMR9ZJbm5WMrzf8ud6w6LyKGqP';