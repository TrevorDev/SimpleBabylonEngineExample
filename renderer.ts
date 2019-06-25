import { Constants } from '@babylonjs/core/Engines/constants';
import { Engine } from '@babylonjs/core/Engines/engine';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Texture, Nullable, Observable, Viewport } from "@babylonjs/core";

export class ChainEffectRenderer {
    public effects: Array<EffectRenderer> = []
    private tmpScreenBuffer:Nullable<Texture> = null
    public outputTexture:Nullable<Texture> = null
    constructor(public engine){

    }
    render(){
        this.effects.forEach((effectRenderer, i)=>{
            if(this.effects.length > 1 && i != this.effects.length - 1){
                if(!this.tmpScreenBuffer){
                    this.tmpScreenBuffer = EffectCreationTools.CreateRenderTargetFrameBuffer(this.engine)
                }
                effectRenderer.outputTexture = this.tmpScreenBuffer
            }else{
                effectRenderer.outputTexture = this.outputTexture;
            }
            // for any next effect make it's input the output of the previous effect
            if(i !== 0){
                effectRenderer.effect.onBindObservable.addOnce(()=>{
                    effectRenderer.effect.setTexture("textureSampler", this.tmpScreenBuffer)
                })
            }
            effectRenderer.render()
        })
    }

    dispose(){
        if(this.tmpScreenBuffer){
            this.tmpScreenBuffer.dispose()
        }
    }
}

export class EffectRenderer {
    private quadBuffers = null;
    public outputTexture:Nullable<Texture> = null
    public onApplyObservable = new Observable<{}>();
    constructor(public engine:Engine, public effect: Effect){
        this.quadBuffers = new FullScreenQuadBuffers(engine)
    }

    render(){
        // Reset state
        this.engine.setViewport(new Viewport(0,0, 1, 1));
        this.engine.enableEffect(this.effect);
        this.engine.setState(false);
        this.engine.setDepthBuffer(false);
        this.engine.setDepthWrite(false);

        // Bind buffers
        if(this.outputTexture){
            this.engine.bindFramebuffer(this.outputTexture.getInternalTexture())
        }
        this.engine.bindBuffers(this.quadBuffers.vertexBuffers, this.quadBuffers.indexBuffer, this.effect);
        this.onApplyObservable.notifyObservers({});
        // Render
        this.engine.drawElementsType(Constants.MATERIAL_TriangleFillMode, 0, 6);
        if(this.outputTexture){
            this.engine.unBindFramebuffer(this.outputTexture.getInternalTexture())
        }
    }
}

export class FullScreenQuadBuffers {
    private static vertices = [1, 1, -1, 1, -1, -1, 1, -1];
    private static indices = [0, 1, 2, 0, 2, 3];
    public vertexBuffers;
    public indexBuffer;

    constructor(engine){
        this.vertexBuffers = {
            [VertexBuffer.PositionKind]: new VertexBuffer(engine, FullScreenQuadBuffers.vertices, VertexBuffer.PositionKind, false, false, 2),
        };
        this.indexBuffer = engine.createIndexBuffer(FullScreenQuadBuffers.indices);
    }
}

export class EffectCreationTools {
    public static counter = 0;
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

    public static CreateEffectAsync(name, options: {engine:Engine, fragmentShader: string, attributeNames:Array<string>, uniformNames:Array<string>, samplerNames:Array<string>}):Promise<Effect>{
        return new Promise((res, rej)=>{
            var shaderName = name+EffectCreationTools.counter++;
            Effect.ShadersStore[shaderName+"FragmentShader"] = options.fragmentShader
            var effect:Effect = options.engine.createEffect({vertex: "postprocess", fragment: shaderName}, options.attributeNames, options.uniformNames, options.samplerNames, "", undefined)
            if(effect.isReady){
                res(effect)
            }else{
                effect.onCompiled = ()=>{
                    res(effect)
                }
            }            
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