# Kenya Weather Advisory

## Run locally

The weather API key must stay on the Node server. Keep it in `agricultural-weather-app/.env.local` as `OPENWEATHER_API_KEY=your-key`; do not use a `REACT_APP_` prefix because Create React App embeds those variables in browser files.

Start the server and frontend together from this directory:

```bash
npm start
```

The frontend sends weather requests to the same-origin `/api` routes, and the server forwards them to OpenWeather. The server only accepts coordinates inside the Kenya service area. For production, run `npm run build` and `npm run serve` on a Node.js 18+ host, set `HOST=0.0.0.0` in the host environment, and serve the app and `/api` routes from that server. A static-only host cannot keep this API key private unless it forwards `/api` to a server-side function.

On startup, the browser asks for location permission. When allowed inside Kenya, the app labels the nearest county and requests weather for the precise device coordinates. If permission is denied or the location is outside the supported region, it uses Nairobi. Browser geolocation requires HTTPS in production (localhost works for development).

If the key was previously added as `REACT_APP_OPENWEATHER_API_KEY`, remove that variable from the hosting environment and rebuild the frontend. Rotate any key that has been exposed in a browser bundle or screenshot.

## Create React App commands

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open the local URL printed in the terminal. If port 3000 is already in use, Create React App chooses another port.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
