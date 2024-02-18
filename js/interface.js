/* global Fourmi */
let menuBurger = document.querySelector ( "#menuBurger" );
let menuItems = document.querySelector ( "#menuItems" );
menuBurger.addEventListener ( "click", function () {
	menuItems.hidden = false;
} );

let gauge = document.querySelector ( "#gauge" );
gauge.centre = gauge.querySelector ( "#gpc" );
gauge.p0 = gauge.querySelector ( "#gp0" );
gauge.p1 = gauge.querySelector ( "#gp1" );
gauge.p2 = gauge.querySelector ( "#gp2" );
gauge.p3 = gauge.querySelector ( "#gp3" );
gauge.p4 = gauge.querySelector ( "#gp4" );
gauge.p5 = gauge.querySelector ( "#gp5" );
gauge.p6 = gauge.querySelector ( "#gp6" );
gauge.p7 = gauge.querySelector ( "#gp7" );

let infos = {
	"fps" : document.querySelector ( "#fps" ),
	"bfs" : document.querySelector ( "#bfs" ),
	"pps" : document.querySelector ( "#pps" ),
	"ops" : document.querySelector ( "#ops" ),
	"use" : document.querySelector ( "#usage" )
};

let myFourmi = new Fourmi ( );

myFourmi.applyInfosCallback ( infos );
myFourmi.buildCommands ( document.querySelector ( "#controls" ) );
myFourmi.applyEvents ( document );

let cyclePicker = document.querySelector ( "#cycle-picker" );
cyclePicker.addEventListener ( "click", function ( ) {
	//console.log(cyclesObjManager)
	cyclesManager_.open ( dataCycles );
} );

myFourmi.setCycle ( dataCycles.item(2), function ( dataCycle ) {
	domCycleTools.createCycle ( dataCycle, document.querySelector ( "#couleurs-list" ) );
} );

