import * as BABYLON from "@babylonjs/core"


import { Constants } from '@babylonjs/core/Engines/constants';
import { Engine } from '@babylonjs/core/Engines/engine';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Effect } from '@babylonjs/core/Materials/effect';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { Texture, Nullable, RenderTargetTexture, InternalTexture } from "@babylonjs/core";

export class EffectRenderer {
    quadBuffers = null;
    public outputTexture:Nullable<Texture> = null
    constructor(public engine:Engine, public effect: Effect){
        this.quadBuffers = new FullScreenQuadBuffers(engine)
    }

    bind(){
        // Reset state
        this.engine.setViewport(new BABYLON.Viewport(0,0, 1, 1));
        this.engine.enableEffect(this.effect);
        this.engine.setState(false);
        this.engine.setDepthBuffer(false);
        this.engine.setDepthWrite(false);
        
        // Bind buffers
        if(this.outputTexture){
            this.engine.bindFramebuffer(this.outputTexture.getInternalTexture())
        }
        this.engine.bindBuffers(this.quadBuffers.vertexBuffers, this.quadBuffers.indexBuffer, this.effect);
    }
    render(){
        this.engine.drawElementsType(Constants.MATERIAL_TriangleFillMode, 0, 6);
        if(this.outputTexture){
            this.engine.unBindFramebuffer(this.outputTexture.getInternalTexture())
        }
    }
}

export class FullScreenQuadBuffers {
    private static vertices = [1, 1, -1, 1, -1, -1, 1, -1];
    private static indices = [0, 1, 2, 0, 2, 3];
    private vertexBuffers = null;
    private indexBuffer = null;

    constructor(engine){
        this.vertexBuffers = {
            [VertexBuffer.PositionKind]: new VertexBuffer(engine, FullScreenQuadBuffers.vertices, VertexBuffer.PositionKind, false, false, 2),
        };
        this.indexBuffer = engine.createIndexBuffer(FullScreenQuadBuffers.indices);
    }
}

export class SimpleEffect {

    public static counter = 0;

    public static CreateTextureAsync(engine, url):Promise<Texture>{
        return new Promise((res, rej)=>{
            var customTexture = new Texture(url, null);
            customTexture._texture = engine.createTexture(customTexture.url, false, true, null, undefined, ()=>{
                console.log("loaded")
                customTexture._texture.isReady = true
                res(customTexture)
            }, ()=>{
                rej()
                console.log("load err")
            });
        })
    }

    public static CreateEffectAsync(name, options: {engine:Engine, fragmentShader: string, attributeNames:Array<string>, uniformNames:Array<string>, samplerNames:Array<string>}):Promise<Effect>{
        return new Promise((res, rej)=>{
            //TODO generate name
            var shaderName = name+SimpleEffect.counter++;
            console.log(shaderName)
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