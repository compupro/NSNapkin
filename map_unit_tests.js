testClaim = new MapPlot(new L.latLng(0,0), "%test popup content%", "red", "%test creator%");
testClaim.constructPolygon(true, true);
testClaim.addToMap(true);

testClaim = new MapPlot(new L.latLng(50,50), null, "blue", "null content");
testClaim.addPoint(new L.LatLng(25,25));
testClaim.addPointArray([new L.LatLng(10,25), new L.LatLng(30,66)]);
testClaim.constructPolygon(true, true);
testClaim.addToMap(false);