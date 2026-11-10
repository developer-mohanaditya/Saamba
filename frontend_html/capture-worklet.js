class Recorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.length = Math.round(sampleRate * 15);
    this.buffer = new Float32Array(this.length);
    this.used = 0;
    this.port.onmessage = e => { if (e.data === 'flush') { this.flush(); this.port.postMessage({type:'flushed'}); } };
  }
  flush() {
    if (!this.used) return;
    const samples = this.buffer.slice(0,this.used);
    this.port.postMessage({type:'chunk',samples,rate:sampleRate},[samples.buffer]);
    this.buffer = new Float32Array(this.length); this.used = 0;
  }
  process(inputs,outputs) {
    const input=inputs[0]?.[0];
    if (input) {
      let offset=0;
      while(offset<input.length) {
        const count=Math.min(input.length-offset,this.length-this.used);
        this.buffer.set(input.subarray(offset,offset+count),this.used);
        this.used+=count;offset+=count;
        if(this.used===this.length)this.flush();
      }
    }
    return true;
  }
}
registerProcessor('saamba-recorder',Recorder);
