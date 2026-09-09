'use client';
import {useEffect} from 'react';
export default function PointerFX(){useEffect(()=>{const move=(e:MouseEvent)=>{const x=e.clientX/window.innerWidth*100;const y=e.clientY/window.innerHeight*100;document.documentElement.style.setProperty('--mx',`${x}%`);document.documentElement.style.setProperty('--my',`${y}%`);document.documentElement.style.setProperty('--px',`${(x-50)/7}deg`);document.documentElement.style.setProperty('--py',`${(y-50)/10}deg`)};window.addEventListener('mousemove',move,{passive:true});return()=>window.removeEventListener('mousemove',move)},[]);return null}
