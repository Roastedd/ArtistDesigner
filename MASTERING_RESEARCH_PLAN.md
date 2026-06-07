# Mastering in DAW Research Plan

## What the research says

- Beginner mastering should start with mix readiness: if the vocal is buried, bass is muddy, or drums lack punch, fix the mix before mastering.
- Mastering should happen in a fresh DAW project with a final stereo export, not inside the writing or mixing session.
- Reference tracks matter, but they must be level-matched before judging tone, width, and punch.
- Most beginner-safe mastering moves are tiny: 0.5-1.5 dB EQ moves, 1-2 dB compression gain reduction, and limiting only at the end.
- Loudness targets are guidelines, not the musical goal. Around -14 LUFS integrated with a -1.0 dBTP true peak ceiling is a safe beginner target for broad streaming translation.
- True peak matters because inter-sample peaks can clip after lossy conversion even when sample meters look safe.
- Stock DAW plugins are enough for beginner mastering. Paid tools improve workflow and metering, not the basic concept.
- FL Studio update: Image-Line documents Fruity Limiter as a compressor/limiter/gate suited to maximizing and limiting complete mixes, and Maximus as a multiband maximizer suited to final-stage mastering. FL's stock Wave Candy and Fruity dB Meter are useful visual meters, but a dedicated LUFS/true-peak plugin such as Youlean Loudness Meter is clearer for beginners.
- FL Studio click-by-click update: Image-Line documents that Mixer audio passes through effect slots from Slot 1 to Slot 10, and the Select plugin window can be opened from an effect slot with More plugins, then a plugin can be double-clicked into that slot. Beginner instructions should say exactly which Mixer insert and slot to click.

## Sources reviewed

- iZotope: mastering for streaming, LUFS, normalization, platform behavior, and true peak guidance: https://www.izotope.com/en/learn/mastering-for-streaming-platforms
- iZotope: using reference tracks in mastering, including broad tonal/dynamic/stereo comparison: https://www.izotope.com/en/learn/how-to-use-mastering-references
- Orphiq: beginner step-by-step mastering chain, mix prep, stock plugins, and export guidance: https://orphiq.com/resources/how-to-master-a-song
- Remasterify: true peak explanation, safe levels, and beginner-friendly metering guidance: https://blog.remasterify.com/true-peak-101-everything-you-need-to-know/
- Additional DAW-specific research surfaced stock-plugin workflows for FL Studio and Ableton Live, with emphasis on EQ, compression, limiting, stereo imaging, and loudness metering.
- Image-Line manual: Fruity Limiter plugin documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/Fruity%20Limiter.htm
- Image-Line manual: Maximus plugin documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/Maximus.htm
- Image-Line manual: Wave Candy visual metering documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/Wave%20Candy.htm
- Image-Line manual: FL Studio export/render documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/fformats_save_export.htm
- Image-Line manual: Mixer effects slots documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer_plugin.htm
- Image-Line manual: Fruity Parametric EQ 2 documentation: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/Fruity%20Parametric%20EQ%202.htm
- Youlean Loudness Meter: free VST/AU/AAX loudness meter with LUFS/LRA/PLR measurements: https://youlean.co/youlean-loudness-meter/
- Recent FL Studio tutorial research included Image-Line manual pages, YouTube search results for FL stock mastering walkthroughs, Audeobox 2026 FL mastering guidance, Mayu Beatz 2026 stock-plugin mastering, and Teknup 2026 stock-plugin mastering.

## Product plan

### 1. Beginner DAW mastering checklist

Status: started in the first-song guide.

Add a guided checklist before DAW-specific instructions:

- Export/prepare the stereo file.
- Create a fresh mastering project.
- Add a reference track and level-match it.
- Add a loudness/true peak meter after the limiter.
- Make one small change at a time.
- A/B against the original and reference.
- Export a distribution WAV and an archive WAV.

### 2. DAW-specific detail pages

Create fuller guides for:

- FL Studio stock chain.
- Ableton Live stock chain.
- Optional future pages: Logic Pro, Reaper, GarageBand/BandLab mobile.

Each page should include exact stock plugin names, safe starting settings, screenshots or diagrams later, and a troubleshooting section.

### 3. Mastering assistant from uploaded audio

Extend the existing audio analysis flow into a beginner report:

- Integrated LUFS.
- True peak or sample peak approximation if true peak is unavailable.
- Dynamic range warning.
- Low-end/brightness/stereo-width notes.
- Plain-English next actions: "lower limiter gain", "check 250 Hz mud", "vocal may be buried", etc.

### 4. Export preset helper

Add a small UI that tells users exactly what to export based on target:

- Distributor WAV: 16-bit/44.1 kHz if required.
- Archive WAV: 24-bit at project sample rate.
- Social preview: MP3/AAC only after the WAV master is complete.
- Disable normalize.
- Dither only when reducing bit depth.

### 5. Reference-track coach

Ask the user what they like about a reference:

- Low-end punch.
- Vocal brightness.
- Overall loudness.
- Stereo width.
- Warmth/saturation.

Then translate that into beginner-safe DAW moves rather than generic advice.

## Implementation priority

1. Expand first-song Master in your DAW step with beginner checks and troubleshooting.
2. Add a dedicated `/guides/production/mastering` page with fuller FL/Ableton workflows.
3. Connect uploaded audio analysis results to a mastering-readiness score.
4. Add export preset and reference-track coaching controls.
5. Add screenshots or short clips once the text workflow is stable.