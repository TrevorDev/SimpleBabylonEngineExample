import * as BABYLON from "@babylonjs/core"
import { Engine } from '@babylonjs/core/Engines/engine';
import { SinglePassBabylonRenderer } from "./renderer";

var main = async ()=>{
    var canvas = document.getElementById("testCanvas") as HTMLCanvasElement;
    // Create engine
    // Disable a couple of options increasing perf as they are not useful in this single pass use case.
    const engine = new Engine(canvas, false, {
        premultipliedAlpha: false,
        stencil: false,
        disableWebGL2Support: false,
        preserveDrawingBuffer: false,
    });

    // Create renderer
    var renderer = new SinglePassBabylonRenderer(engine);
    renderer.createRenderPipeline(
        {
            fragmentShader: `
                #extension GL_OES_standard_derivatives : enable
            
                varying vec2 vUV;
                uniform sampler2D textureSamplerVideo;
                uniform vec2 offset;
                void main(void) {
                    vec2 coords = vUV;
                    coords.x += offset.x;
                    vec3 video = texture2D(textureSamplerVideo, coords).rgb;
            
                    gl_FragColor = vec4(video, 1.0);
                }
            `,
            textureNames: ["textureSamplerVideo"],
            uniformNames: ["offset"]
        }
    );

    // Shader Inputs
    var index = 0;
    var customTexture = await SinglePassBabylonRenderer.CreateTextureAsync(engine,"https://picsum.photos/id/1035/200/200")
    var customTexture2 = await SinglePassBabylonRenderer.CreateTextureAsync(engine,"https://picsum.photos/id/1045/200/200")
    
    var offset = new BABYLON.Vector2(0.0, 0)
    renderer.effect.setTexture('textureSamplerVideo', customTexture);
    renderer.effect.setVector2("offset", offset)

    // Update effect input
    document.onkeydown = ()=>{
        index++
        renderer.effect.setTexture('textureSamplerVideo', index % 2 == 1 ? customTexture2: customTexture);
    }
    document.onwheel = (e)=>{
        offset.x += e.deltaY/1000;
        renderer.effect.setVector2("offset", offset)
    }

    // Render loop
    var loop = ()=>{
        window.requestAnimationFrame(()=>{
            renderer.render()
            loop()
        })
    }
    loop()
}
main();



