import { Engine } from '@babylonjs/core/Engines/engine';
import { EffectCreationTools, EffectWrapper, EffectRenderer } from "./renderer";
import { Vector2 } from "@babylonjs/core/Maths";

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
    var renderImage = new EffectWrapper({
        engine: engine,
        fragmentShader: `
            #extension GL_OES_standard_derivatives : enable
    
            varying vec2 vUV;
            uniform sampler2D inputImage;
            uniform vec2 offset;
            void main(void) {
                vec2 coords = vUV;
                coords.x += offset.x;
                vec3 video = texture2D(inputImage, coords).rgb;
    
                gl_FragColor = vec4(video, 1.0);
            }
        `,
        // Position and scale are required for the vertex shader
        attributeNames: ["position"],
        uniformNames: ["scale", "offset"],
        samplerNames: ["inputImage"]
    })
    var customTexture = await EffectCreationTools.CreateTextureAsync(engine,"https://picsum.photos/id/1045/200/200")
    var scaleValue = new Vector2(1,1)
    var offset = new Vector2(0.5, 0)
    document.onwheel = (e)=>{
        offset.x += e.deltaY/1000
    }
    renderImage.onApplyObservable.add(()=>{
        renderImage.effect.setTexture('inputImage', customTexture);
        renderImage.effect.setVector2("offset", offset)
        renderImage.effect.setVector2("scale", scaleValue);
    })
    
    // Create second effect
    var makeRed = new EffectWrapper({
        engine: engine,
        fragmentShader: `
            #extension GL_OES_standard_derivatives : enable
        
            varying vec2 vUV;
            uniform sampler2D textureSampler;
            uniform vec2 offset;
            void main(void) {
                vec3 inputTexture = texture2D(textureSampler, vUV).rgb;
                inputTexture.r = 1.0;
                gl_FragColor = vec4(inputTexture, 1.0);
            }
        `,
        attributeNames: ["position"],
        uniformNames: ["scale"],
        samplerNames: ["textureSampler"]
    })
    makeRed.onApplyObservable.add(()=>{
        // This will be set by the effect renderer
        //  makeRed.effect.setTexture('textureSampler', customTexture2);
        makeRed.effect.setVector2("offset", offset)
        makeRed.effect.setVector2("scale", scaleValue);
    })    

    // Create an effect chain to render effects in desired order
    var renderer = new EffectRenderer(engine);
    var effects = [renderImage, makeRed]

    // on key press remove an effect
    document.onkeydown = ()=>{
        if(effects.length == 1){
            effects = [renderImage, makeRed]
        }else{
            effects = [renderImage]
        }
    }

    // Render loop
    engine.runRenderLoop(()=>{
        renderer.render(effects)
    })
}
main();



