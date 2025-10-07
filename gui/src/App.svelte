<script>
	import Movement from './components/Movement.svelte';
	import Battery from './components/Battery.svelte';

  // Calling a service
  // -----------------

//   var addTwoIntsClient = new ROSLIB.Service({
//     ros : ros,
//     name : '/add_two_ints',
//     serviceType : 'rospy_tutorials/AddTwoInts'
//   });

//   var request = new ROSLIB.ServiceRequest({
//     a : 1,
//     b : 2
//   });

//   addTwoIntsClient.callService(request, function(result) {
//     console.log('Result for service call on '
//       + addTwoIntsClient.name
//       + ': '
//       + result.sum);
//   });

  // Getting and setting a param value
  // ---------------------------------

//   ros.getParams(function(params) {
//     console.log(params);
//   });

//   var maxVelX = new ROSLIB.Param({
//     ros : ros,
//     name : 'max_vel_y'
//   });

//   maxVelX.set(0.8);
//   maxVelX.get(function(value) {
//     console.log('MAX VAL: ' + value);
//   });
</script>


<main>
	<!-- add connected sign -->
	<Battery />
	<img src="./MIA2.jpg" alt="mia logo" class="logo">
	<Movement />
</main>


<style>
	:global(body) {
	margin: 0;
	background-color: #075B5E; /* dark blue-gray */
	color: white;              /* optional: makes text visible */
}
	main {
		position: relative;      
		min-height: 100vh;       /* make it fill the full viewport height */
		/* width: 100%;              */
		/* overflow: hidden;        optional: prevents scrollbars if elements go out of bounds  */
	}

	.logo{
		position: relative;    /* lets you move it around freely */
		width: 12vw;           /* set size */
		height: auto;           /* keep aspect ratio */
		top: 0vh;              /* distance from top */
		left: 34vw;             /* distance from left */
	}

	/* h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	h2 {
		color: #752e2e;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 4;
	} */

</style>
