import * as BABYLON from "@babylonjs/core"
import { Engine } from '@babylonjs/core/Engines/engine';
import { SimpleEffect, EffectRenderer } from "./renderer";
import { Effect, Constants } from "@babylonjs/core";

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

    // Create first effect
    var effect = await SimpleEffect.CreateEffectAsync("OffsetImage",
        {
            engine: engine,
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
            attributeNames: ["position"],
            uniformNames: ["scale", "offset"],
            samplerNames: ["textureSamplerVideo"]
        }
    )
    var customTexture = await SimpleEffect.CreateTextureAsync(engine,"https://picsum.photos/id/1035/200/200")
    var customTexture2 = await SimpleEffect.CreateTextureAsync(engine,"https://picsum.photos/id/1045/200/200")
    var offset = new BABYLON.Vector2(0.5, 0)
    document.onwheel = (e)=>{
        offset.x += e.deltaY/1000
    }
    var s = new BABYLON.Vector2(1,1)
    var r = new EffectRenderer(engine, effect)
    

    // Create second effect
    var effect2 = await SimpleEffect.CreateEffectAsync("makeRed",
        {
            engine: engine,
            fragmentShader: `
                #extension GL_OES_standard_derivatives : enable
            
                varying vec2 vUV;
                uniform sampler2D textureSamplerVideo;
                uniform vec2 offset;
                void main(void) {
                    vec3 video = texture2D(textureSamplerVideo, vUV).rgb;
                    video.r = 1.0;
                    gl_FragColor = vec4(video, 1.0);
                }
            `,
            attributeNames: ["position"],
            uniformNames: ["scale"],
            samplerNames: ["textureSamplerVideo"]
        }
    )
    var r2 = new EffectRenderer(engine, effect2)

    // Render loop
    var tempScreenBuffer = SimpleEffect.CreateRenderTargetFrameBuffer(engine)
    var loop = ()=>{
        window.requestAnimationFrame(()=>{
            r.outputTexture = tempScreenBuffer
           
            r.bind()
            effect.setTexture('textureSamplerVideo', customTexture2);
            effect.setVector2("offset", offset)
            effect.setVector2("scale", s);
            r.render()
            r2.bind()
            effect2.setTexture('textureSamplerVideo', tempScreenBuffer);
            effect2.setVector2("offset", offset)
            effect2.setVector2("scale", s);
            r2.render()
            loop()
        })
    }
    loop()
}
main();



