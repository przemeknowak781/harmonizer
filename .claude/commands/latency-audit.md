Audit the audio pipeline for latency issues:

1. Check buffer sizes in AudioWorklet processors (target: 2048 samples for pitch detection, 4096 FFT for pitch shifting)
2. Verify hop sizes and overlap ratios match spec (pitch detector: 50% overlap, pitch shifter: hop 256)
3. Look for unnecessary AudioNode chains that add latency
4. Check for synchronous operations on the audio thread
5. Verify AudioContext sample rate handling
6. Calculate theoretical minimum latency based on current buffer/FFT configuration
7. Report total estimated pipeline latency vs. the 50ms target
