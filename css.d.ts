// Ambient declarations so `tsc --noEmit` understands CSS imports that the
// Expo/Metro web bundler resolves at build time. The template imports a global
// stylesheet (`import '@/global.css'`) and CSS modules (`import classes from
// './x.module.css'`); without these declarations tsc reports TS2307/TS2882.

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';
