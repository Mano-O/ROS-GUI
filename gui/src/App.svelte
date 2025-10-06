<script>
	import Movement from './components/Movement.svelte';

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
	<h1>ROS GUI!</h1>
	<h2>Under Construction.</h2>
	<Movement />
</main>


<style>

	main {
		position: relative;      
		min-height: 100vh;       /* make it fill the full viewport height */
		/* width: 100%;              */
		/* overflow: hidden;        optional: prevents scrollbars if elements go out of bounds  */
	}

	h1 {
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
	}

</style>
