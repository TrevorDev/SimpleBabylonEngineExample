import { Constants } from '@babylonjs/core/Engines/constants';
import { Engine } from '@babylonjs/core/Engines/engine';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Texture, Nullable, Observable, Viewport } from "@babylonjs/core";

export class EffectRenderer {
    private static vertices = [1, 1, -1, 1, -1, -1, 1, -1];
    private static indices = [0, 1, 2, 0, 2, 3];
    public vertexBuffers;
    public indexBuffer;
    private tmpScreenBuffer:Nullable<Texture> = null
    constructor(public engine:Engine){
        this.vertexBuffers = {
            [VertexBuffer.PositionKind]: new VertexBuffer(engine, EffectRenderer.vertices, VertexBuffer.PositionKind, false, false, 2),
        };
        this.indexBuffer = engine.createIndexBuffer(EffectRenderer.indices);
    }
    render(effectWrappers:Array<EffectWrapper>, outputTexture:Nullable<Texture> = null){
        effectWrappers.forEach((effectWrapper, i)=>{
            var renderTo = outputTexture;
            if(effectWrappers.length > 1 && i != effectWrappers.length - 1){
                if(!this.tmpScreenBuffer){
                    this.tmpScreenBuffer = EffectCreationTools.CreateRenderTargetFrameBuffer(this.engine)
                }
                renderTo = this.tmpScreenBuffer
            }else{
                renderTo = outputTexture;
            }
            // for any next effect make it's input the output of the previous effect
            if(i !== 0){
                effectWrapper.effect.onBindObservable.addOnce(()=>{
                    effectWrapper.effect.setTexture("textureSampler", this.tmpScreenBuffer)
                })
            }

            // Reset state
            this.engine.setViewport(new Viewport(0,0, 1, 1));
            this.engine.enableEffect(effectWrapper.effect);
            this.engine.setState(false);
            this.engine.setDepthBuffer(false);
            this.engine.setDepthWrite(false);
    
            // Bind buffers
            if(renderTo){
                this.engine.bindFramebuffer(renderTo.getInternalTexture())
            }
            this.engine.bindBuffers(this.vertexBuffers, this.indexBuffer, effectWrapper.effect);
            effectWrapper.onApplyObservable.notifyObservers({});

            // Render
            this.engine.drawElementsType(Constants.MATERIAL_TriangleFillMode, 0, 6);
            if(renderTo){
                this.engine.unBindFramebuffer(renderTo.getInternalTexture())
            }
        })
    }
    dispose(){
        if(this.tmpScreenBuffer){
            this.tmpScreenBuffer.dispose()
        }
    }
}

export class EffectWrapper {
    public onApplyObservable = new Observable<{}>();
    public effect: Effect
    private static counter = 0;
    constructor(creationOptions: {engine:Engine, fragmentShader: string, attributeNames:Array<string>, uniformNames:Array<string>, samplerNames:Array<string>}){
        var shaderName = "EffectWrapperEffect"+EffectWrapper.counter++;
        Effect.ShadersStore[shaderName+"FragmentShader"] = creationOptions.fragmentShader
        this.effect = creationOptions.engine.createEffect({vertex: "postprocess", fragment: shaderName}, creationOptions.attributeNames, creationOptions.uniformNames, creationOptions.samplerNames, "", undefined)   
    }
}

export class EffectCreationTools {
    public static CreateTextureAsync(engine, url):Promise<Texture>{
        return new Promise((res, rej)=>{
            var customTexture = new Texture(url, null);
            customTexture._texture = engine.createTexture(customTexture.url, false, true, null, undefined, ()=>{
                customTexture._texture.isReady = true
                res(customTexture)
            }, ()=>{
                rej()
            });
        })
    }

    public static CreateRenderTargetFrameBuffer(engine:Engine){
        var internalTexture = engine.createRenderTargetTexture(
        {
            width: Math.floor(engine.getRenderWidth(true) / 1),
            height: Math.floor(engine.getRenderHeight(true) / 1),
        },
        {
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            generateMipMaps: false,
            samplingMode: Constants.TEXTURE_NEAREST_NEAREST,
        },
        );
        var customTexture = new Texture("", null);
        customTexture._texture = internalTexture
        return customTexture
    }
}