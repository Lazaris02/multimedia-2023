let check_queue=25; //how frequently it checks the queue in milliseconds--(default value will change from main thread)
let play_interval;




self.onmessage = (e) => {

    if (e.data == 'start') {
        console.log('Hi I am starting!');
        play_interval = setInterval(() => { postMessage('runnin'); }, check_queue); //checks every 30ms

    }
    else if (e.data == 'stop') {
        console.log('hi from stoping interval!');
        clearInterval(play_interval);
        play_interval = null;
    }
    else if (e.data[0] == 'change') {
        check_queue = e.data[1];
        //if I want to change how frequently we check the queue 
        // we need to reset the current interval and reset it with the correct check_queue time.
        console.log('I am in');
        if (play_interval) {
            clearInterval(play_interval);
            play_interval = setInterval(() => { postMessage('running') }, check_queue); 
        }                                                                         
    }
}




