console.log(`
 _   _     _   _             _    _       
| \\ | |   | \\ | |           | |  (_)      
|  \\| |___|  \\| | __ _ _ __ | | ___ _ __  
| . \` / __| . \` |/ _\` | '_ \\| |/ / | '_ \\ 
| |\\  \\__ \\ |\\  | (_| | |_) |   <| | | | |
|_| \\_|___/_| \\_|\\__,_| .__/|_|\\_\\_|_| |_|
                      | |                 
                      |_|                    
==========================================
Komminland's Really Professional Map Thing
==========================================`);
//` //this comment is only here because Notepad++ thinks the template literal was unterminated and it makes the syntax highlighting all wrong when this comment isn't here

/*Set important variables which are tied to the HTML document*/
var htmlMapId = "mainmap";

/*Set raster layer of IRL map tiles to be in the background.*/
var irlLayer = new L.StamenTileLayer("terrain-background");
var map = new L.Map(htmlMapId, {
    center: new L.LatLng(35, 0), //35 looks better
    zoom: 2,
	minZoom: 1,
	maxZoom: 11
});
map.addLayer(irlLayer);
L.control.scale().addTo(map);

/*Generic map plot base class.*/
function MapPlot(point, popupContent, color, creator){
	this.itemType = "MapPlot";
	this.latlngs = Array.isArray(point) ? point : [point];
	this.popupContent = popupContent;
	this.color = color;
	this.creator = creator;
	this.visible = false;
	this.mapPolygon = null;
	
	/*Adds a single LeafLet LatLng as a point defining the plot*/
	this.addPoint = function(point) {
		this.latlngs.push(point);
	}
	
	/*Adds an array of LeafLet LatLngs as points defining the plot*/
	this.addPointArray = function(pointArray){
		this.latlngs.push.apply(this.latlngs, pointArray)
	}
	
	/*Removes a Leaflet LatLng from the points which define the plot*/
	this.removePointByIndex = function(index) {
		delete this.latlngs[index];
	}
	
	/*Constructs a Leaflet Polygon object according to this plot's parameters*/
	this.constructPolygon = function(includePopup, showCreator) {
		this.mapPolygon = L.polygon(this.latlngs, {color:this.color});
		if (includePopup){
			newPopup = "";
			if (this.popupContent != null){
				newPopup = popupContent;
			}
			if (showCreator && this.creator != null){
				newPopup += "<hr>Created by " + creator;
			}
			this.mapPolygon.bindPopup(newPopup);
		}
	}
	
	/*Adds this polygon to the map if its polygon has been constructed.*/
	this.addToMap = function(showPopupOnCreate) {
		if (this.mapPolygon != null){
			this.mapPolygon.addTo(map);
			this.visible = true;
			if (showPopupOnCreate){ this.mapPolygon.openPopup(); }
		}
	}
	
	/*Toggles whether or not this plot's polygon can be seen on the map.*/
	this.toggleVisibility = function() {
		if(this.visible){
			this.mapPolygon.remove();
			this.visible = false;
		} else {
			this.addToMap(false);
		}
	}
	
	this.forceVisible = function() {
		this.constructPolygon(true, true);
		this.addToMap(true);
		this.visible = true;
	}
	
	this.forceInvisible = function() {
		this.mapPolygon.remove();
		this.visible = false;
		this.mapPolygon = null;
	}
	
	this.updatePolygon = function() {
		this.mapPolygon.remove();
		this.constructPolygon(true, true);
		this.addToMap(false);
	}
}

function UnitMarker(point, popupContent, creator){
	this.itemType = "UnitMarker";
	this.latlng = point;
	this.popupContent = popupContent;
	this.creator = creator;
	this.visible = false;
	this.mapMarker = null;
	
	this.constructMapMarker = function(includePopup, showCreator, draggable) {
		this.mapMarker = L.marker(this.latlng, {draggable:draggable});
		this.mapMarker.unitMarkerObject = this;
		if (includePopup){
			newPopup = "";
			if (this.popupContent != null){
				newPopup = popupContent;
			}
			if (showCreator && this.creator != null){
				newPopup += "<hr>Created by " + creator;
			}
			this.mapMarker.bindPopup(newPopup);
		}
		this.mapMarker.on("drag", function(event){event.target.unitMarkerObject.latlng = event.latlng;});
		this.mapMarker.on("contextmenu", function(event){if(createMode == "unit"){event.target.unitMarkerObject.destroy();}});
	}
	
	this.addToMap = function(showPopupOnCreate) {
		if (this.mapMarker != null){
			this.mapMarker.addTo(map);
			this.visible = true;
			if (showPopupOnCreate){ this.mapMarker.openPopup(); }
		}
	}
	
	this.toggleVisibility = function() {
		if(this.visible){
			this.mapMarker.remove();
			this.visible = false;
		} else {
			this.addToMap(false);
		}
	}
	
	this.forceVisible = function() {
		this.constructMapMarker(true, true, true);
		this.addToMap(true);
		this.visible = true;
	}
	
	this.forceInvisible = function() {
		this.mapMarker.remove();
		this.visible = false;
		this.mapMarker = null;
	}
	
	this.destroy = function() {
		this.mapMarker.remove();
		currentCreation.splice(currentCreation.indexOf(this), 1);
	}
}

editingMarkers = [];

function PlotEditingMarker(plot, mapMarker){
	this.plot = plot;
	this.mapMarker = mapMarker;
	this.mapMarker.addTo(map);
	this.mapMarker.editingMarkerObject = this;
	
	this.destroy = function() {
		this.mapMarker.remove();
		editingMarkers.splice(editingMarkers.indexOf(this), 1);
	}
	
	this.updatePlot = function() {
		this.plot.latlngs[editingMarkers.indexOf(this)] = this.mapMarker.getLatLng();
		currentCreation.updatePolygon();
	}
	
	this.mapMarker.on("drag", function(event){event.target.editingMarkerObject.updatePlot();});
	this.mapMarker.on("contextmenu", function(event){deletePoint(editingMarkers.indexOf(event.target.editingMarkerObject));});
}

mapItems = [];
createMode = null;
currentCreation = null;

map.on("click", function (event){
	if(createMode == "polygon"){
		if(currentCreation == null){
			currentCreation = new MapPlot(event.latlng, "Untitled Map Plot", "red", "you");
			editingMarkers.push(new PlotEditingMarker(currentCreation, new L.marker(event.latlng, {opacity:.5, draggable:'true'})));
			currentCreation.constructPolygon(false, false);
			currentCreation.toggleVisibility();
		} else {
			currentCreation.latlngs.push(event.latlng);
			editingMarkers.push(new PlotEditingMarker(currentCreation, new L.marker(event.latlng, {opacity:.5, draggable:'true'})));
			for(x = 0; x < editingMarkers.length; x++){
				editingMarkers[x].updatePlot();
			}
			currentCreation.updatePolygon();
		}
	}
	if(createMode == "unit"){
		currentCreation.push(new UnitMarker(event.latlng, prompt("Name this unit:"), "you"));
		currentCreation[currentCreation.length - 1].constructMapMarker(true, true, true);
		currentCreation[currentCreation.length - 1].toggleVisibility();
	}
});

var togglePolygonCreation = function() {
	if(createMode == null){
		var btn = document.getElementById("polygonEdit");
		btn.value = "\uf00c";
		var tooltip = document.getElementById("polygonTooltip");
		tooltip.innerHTML = "Finish plot";
		createMode = "polygon";
	} else if (createMode == "polygon") {
		var btn = document.getElementById("polygonEdit");
		btn.value = "\uf044";
		var tooltip = document.getElementById("polygonTooltip");
		tooltip.innerHTML = "Create plot";
		createMode = null;
		for(x = 0; x < editingMarkers.length; x++){
			editingMarkers[x].mapMarker.remove();
		}
		currentCreation.toggleVisibility();
		mapItems.push(new MapPlot(currentCreation.latlngs, prompt("Name the new plot:"), prompt("Color of new plot:","red"), prompt("Your nation name:")));
		mapItems[mapItems.length-1].constructPolygon(true, true);
		mapItems[mapItems.length-1].addToMap(true);
		editingMarkers = [];
		currentCreation = null;
	} else {
		alert("Can't enable plot creation while creating another object.");
	}
}

var toggleUnitCreation = function() {
	if(createMode == null){
		var btn = document.getElementById("unitEdit");
		btn.value = "\uf00c";
		var tooltip = document.getElementById("unitTooltip");
		tooltip.innerHTML = "Finish units";
		currentCreation = [];
		createMode = "unit";
	} else if(createMode == "unit"){
		var btn = document.getElementById("unitEdit");
		btn.value = "\uf041";
		var tooltip = document.getElementById("unitTooltip");
		tooltip.innerHTML = "Create units";
		createMode = null;
		creationCreator = prompt("Your nation name:");
		for(x = 0; x < currentCreation.length; x++){
			currentCreation[x].creator = creationCreator;
			currentCreation[x].toggleVisibility();
			mapItems.push(new UnitMarker(currentCreation[x].latlng, currentCreation[x].popupContent, currentCreation[x].creator));
			mapItems[mapItems.length-1].constructMapMarker(true, true, false);
			mapItems[mapItems.length-1].addToMap(false);
		}
		currentCreation = null;
	} else {
		alert("Can't enable unit creation when creating another object.");
	}
}

var deletePoint = function(point) {
	editingMarkers[point].destroy();
	currentCreation.latlngs.splice(point, 1);
	for(x = 0; x < editingMarkers.length; x++){
		editingMarkers[x].updatePlot();
	}
	currentCreation.updatePolygon();
}

var dumpMapItems = function(dumpAsLink){
	for(x = 0; x < mapItems.length; x++){
		mapItems[x].forceInvisible();
	}
	if(dumpAsLink){
		prompt("Copy the following exported map data:", "https://nsnapkin.neocities.org/?mapdata=" + window.btoa(JSON.stringify(mapItems)));
	} else {
		prompt("Copy the following exported map data:", window.btoa(JSON.stringify(mapItems)));
	}
	for(x = 0; x < mapItems.length; x++){
		mapItems[x].forceVisible();
	}
}

var loadMapItems = function(inputdata, promptUser){
	var inputdata;
	if(promptUser){inputdata = prompt("Paste exported map data here:")}
	inputdata = JSON.parse(window.atob(inputdata));
	for(x = 0; x < inputdata.length; x++){
		item = inputdata[x];
		if(item.itemType == "MapPlot"){
			mapItems.push(new MapPlot(item.latlngs, item.popupContent, item.color, item.creator));
			mapItems[mapItems.length-1].constructPolygon(true, true);
			mapItems[mapItems.length-1].toggleVisibility(true);
		} else if(item.itemType == "UnitMarker"){
			mapItems.push(new UnitMarker(item.latlng, item.popupContent, item.creator));
			mapItems[mapItems.length-1].constructMapMarker(true, true, false);
			mapItems[mapItems.length-1].toggleVisibility(true);
		}
	}
}

try {
	loadMapItems(new URLSearchParams(window.location.search).get("mapdata"), false);
} catch (e) {
	console.log("Failed to load map data from URL. If none was specified, ignore this.");
}