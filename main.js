let N = 44.2253, E = -76.4951 // Start coordinates
const map = L.map("map").setView([N, E], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

fetch("data/stores.json")
  .then(res => res.json())
  .then(stores => {
    stores.forEach(store => {
      L.marker([store.lat, store.lng])
        .addTo(map)
        .bindPopup(`<b>${store.name}</b>`);
    });
  });
