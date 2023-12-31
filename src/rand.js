

function func(x){
    if(x<=9) return x;
    let sum=0;
    let counter=0;
    for (let i=0;i<=x;i++){
        if(counter==10){counter=0;continue;}
        sum+=1;
        counter+=1;
    }
    return sum;
}