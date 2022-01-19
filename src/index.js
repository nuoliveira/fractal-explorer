import {
  CRS,
  DomUtil,
  GridLayer,
  Map,
  setOptions,
} from 'leaflet/src/Leaflet';

GridLayer.Fractal = GridLayer.extend({
  initialize(options) {
    setOptions(this, options);
    this.worker = new Worker(new URL('./worker.js', import.meta.url));
  },

  createTile({ x, y, z }, done) {
    const tile = DomUtil.create('canvas', 'leaflet-tile');
    const context = tile.getContext('bitmaprenderer');
    tile.width = tile.height = this.options.tileSize;

    const scale = 2 ** z;
    const left = (x + 0) / scale;
    const top = (y + 0) / scale;
    const right = (x + 1) / scale;
    const bot = (y + 1) / scale;

    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      const bitmap = event.data;
      context.transferFromImageBitmap(bitmap);
      done(null, tile);
      channel.port1.close();
      channel.port2.close();
    };

    channel.port1.onmessageerror = (event) => {
      const error = event.data;
      done(error, tile);
      channel.port1.close();
      channel.port2.close();
    };

    this.worker.postMessage([left, bot, right, top], [channel.port2]);
    return tile;
  },
});

window.addEventListener('load', main);

function main() {
  const container = DomUtil.create('div', 'container', document.body);

  const map = new Map(container, {
    crs: CRS.Simple,
    center: [0, 0],
    zoom: 0,
    zoomControl: false,
  });

  const fractal = new GridLayer.Fractal({
    attribution: 'Mandelbrot set',
    tileSize: 256,
    minZoom: -Infinity,
    maxZoom: +Infinity,
    updateWhenZooming: false,
  }).addTo(map);
}
