import { Engine } from '@babylonjs/core/Engines/engine';
import { EffectCreationTools, EffectRenderer, ChainEffectRenderer } from "./renderer";
import { Vector2 } from "@babylonjs/core";

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
    var renderImageEffect = await EffectCreationTools.CreateEffectAsync("OffsetImage",
        {
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
        }
    )
    // var customTexture2 = await EffectCreationTools.CreateTextureAsync(engine,"https://picsum.photos/id/1035/200/200")
    var customTexture = await EffectCreationTools.CreateTextureAsync(engine,"https://picsum.photos/id/1045/200/200")
    var offset = new Vector2(0.5, 0)
    document.onwheel = (e)=>{
        offset.x += e.deltaY/1000
    }
    var s = new Vector2(1,1)
    var renderImage = new EffectRenderer(engine, renderImageEffect)
    renderImage.onApplyObservable.add(()=>{
        renderImageEffect.setTexture('inputImage', customTexture);
        renderImageEffect.setVector2("offset", offset)
        renderImageEffect.setVector2("scale", s);
    })
    

    // Create second effect
    var makeRedEffect = await EffectCreationTools.CreateEffectAsync("makeRed",
        {
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
        }
    )
    var makeRed = new EffectRenderer(engine, makeRedEffect)
    makeRed.onApplyObservable.add(()=>{
        // This will be set by the ChainEffectRenderer
        //  makeRedEffect.setTexture('textureSampler', customTexture2);
        makeRedEffect.setVector2("offset", offset)
        makeRedEffect.setVector2("scale", s);
    })    

    // Create an effect chain to render effects in order
    var renderer = new ChainEffectRenderer(engine);
    renderer.effects = [renderImage, makeRed]

    // on key press remove an effect
    document.onkeydown = ()=>{
        if(renderer.effects.length == 1){
            renderer.effects = [renderImage, makeRed]
        }else{
            renderer.effects = [renderImage]
        }
    }

    // Render loop
    renderer.render()
    var loop = ()=>{
        window.requestAnimationFrame(()=>{
            renderer.render()
            loop()
        })
    }
    loop()
}
main();



