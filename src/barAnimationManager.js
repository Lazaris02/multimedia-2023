let animation_interval;
let call_animation; // in milliseconds -- will change from main-thread



self.onmessage = (e)=>{
    if(e.data == 'start'){
        console.log('starting animation');
        postMessage('animate');
        animation_interval = setInterval(()=>{postMessage('animate')},call_animation); 
    }
    else if(e.data == 'stop'){
        console.log('stoping animation');
        clearInterval(animation_interval);
        animation_interval = null;
    }
    else if(e.data[0] == 'change'){
        console.log('changing animation timing');
        call_animation = e.data[1]*1000; // convert the data into milliseconds
        if(animation_interval){
            clearInterval(animation_interval);
            animation_interval = setInterval(()=>{postMessage('animate')},call_animation);
            console.log('set new animation interval!')
        }
    }
}

