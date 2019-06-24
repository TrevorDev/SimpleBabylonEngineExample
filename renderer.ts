import * as BABYLON from "@babylonjs/core"


import { Constants } from '@babylonjs/core/Engines/constants';
import { Engine } from '@babylonjs/core/Engines/engine';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Effect } from '@babylonjs/core/Materials/effect';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { Texture, Nullable } from "@babylonjs/core";

export class SinglePassBabylonRenderer {
    public engine:Engine;
    public effect:Nullable<Effect> = null;

    private vertexBuffers = null;
    private indexBuffer = null;
    private postProcess = null;

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

    constructor(engine) {
        this.engine = engine
    }

    /**
     * Creates a special pipeline for babylon.js
     * As we are only compositing various textures and effects everything can be done in
     * only one draw call per frame.
     *
     * We also do not need camera or meshes as we only render a full screen quad.
     */
    createRenderPipeline(settings: {fragmentShader: string, uniformNames: Array<string>, textureNames: Array<string>}) {
        var shaderName = "compositing"
        // Custom composition shader.
        Effect.ShadersStore[shaderName+"FragmentShader"] = settings.fragmentShader

        // Creates the post process attach to the shader
        this.postProcess = new PostProcess(
            shaderName,
            shaderName,
            settings.uniformNames,
            settings.textureNames,
            1,
            null,
            null,
            this.engine,
            false,
        );

        this.effect = this.postProcess.apply();

        // Creates buffers to render directly without camera
        const vertices = [1, 1, -1, 1, -1, -1, 1, -1];
        const indices = [0, 1, 2, 0, 2, 3];
        this.vertexBuffers = {
            [VertexBuffer.PositionKind]: new VertexBuffer(this.engine, vertices, VertexBuffer.PositionKind, false, false, 2),
        };
        this.indexBuffer = this.engine.createIndexBuffer(indices);
        this.engine.bindBuffers(this.vertexBuffers, this.indexBuffer, this.effect);
    }

    render(){
        this.resetViewPort();
        this.postProcess.apply();
        this.engine.drawElementsType(Constants.MATERIAL_TriangleFillMode, 0, 6);
    }

    /**
     * Resets the viewport on the engine to ensure it matches the canvas size
     */
    resetViewPort() {
        this.engine.setViewport(new BABYLON.Viewport(0,0, 1, 1));
    }

    dispose(){
        if (this.postProcess) this.postProcess.dispose();
        if (this.effect) this.effect.dispose();
        if (this.vertexBuffers) this.vertexBuffers[VertexBuffer.PositionKind].dispose();
        if (this.indexBuffer) this.engine._releaseBuffer(this.indexBuffer);
    }
}