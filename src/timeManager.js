let check_queue = 30; //how frequently it checks the queue in milliseconds--(default value-might change from main thread)
let play_interval;




self.onmessage = (e) => {

    if (e.data == 'start') {
        console.log('Hi I am starting!');
        play_interval = setInterval(() => { postMessage('runnin'); }, check_queue); //checks every 50ms

    }
    else if (e.data == 'stop') {
        console.log('hi from stoping interval!');
        clearInterval(play_interval);
        play_interval = null;
    }
    else if (e.data == 'change') {
        check_queue = e.data.change;
        //if I want to change how frequently we check the queue 
        // we need to reset the current interval and reset it with the correct check_queue time. 
        if (play_interval) {
            clearInterval(play_interval);
            play_interval = setInterval(() => { postMessage('running') }, check_queue); 
        }                                                                         
    }
}



console.log('I am working!');

