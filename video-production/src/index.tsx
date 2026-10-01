import React from 'react';import {Composition,registerRoot} from 'remotion';import {Film} from './Film';import timeline from '../timeline.json';
registerRoot(()=> <Composition id="WorkshopIntro" component={Film} durationInFrames={timeline.durationInFrames} fps={30} width={1920} height={1080} defaultProps={{bgm:true,embeddedCaptions:true}}/>);
