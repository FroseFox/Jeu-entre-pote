using System.Collections.Generic;
using UnityEngine;

public sealed partial class StreetCrowd
{
    [System.Serializable]
    public class Batch
    {
        public int seats;
        public float radius, arc, heading, curvature, travel;
    }
    readonly List<Batch> batches = new List<Batch>();
    readonly List<Vector3> corners = new List<Vector3>();
    readonly List<Vector2> sprites = new List<Vector2>(), anchors = new List<Vector2>();
    readonly List<int> indices = new List<int>();
    Mesh pocketMesh;
    MeshRenderer pocketRenderer;
    MaterialPropertyBlock rotationBlock;
    bool pocketsDirty;
    public int PocketPeople { get; private set; }

    public void BoardGroup(double count,float radius,float angle,int blades,float curvature)
    {
        if (count<1) return;
        float arc=2*Mathf.PI/blades;
        float middle=Mathf.PI/2-curvature+arc*.5f;
        float pocket=middle+Mathf.Round((Mathf.PI-angle-middle)/arc)*arc;
        var batch=new Batch {seats=(int)System.Math.Min(72,count),radius=radius,arc=arc,heading=pocket,curvature=curvature};
        batches.Add(batch);
        PocketPeople+=batch.seats;
        pocketsDirty=true;
    }
    public Batch[] CaptureGroups() => batches.ToArray();
    public void RestoreGroups(Batch[] saved)
    {
        batches.Clear();
        PocketPeople=0;
        if(saved!=null) foreach(var group in saved) {
            if(group==null || group.seats<=0 || group.seats>72 || group.travel<0 || group.travel>=Mathf.PI || group.radius<=0)continue;
            if(batches.Count>=10)break;
            batches.Add(group);
            PocketPeople+=group.seats;
        }
        pocketsDirty=true;
    }
    public void TurnGroups(float turn,float angle)
    {
        for(int i=batches.Count-1;i>=0;i--) {
            var group=batches[i];
            group.travel+=turn;
            if(group.travel<Mathf.PI)continue;
            PocketPeople-=group.seats;
            batches.RemoveAt(i);
            pocketsDirty=true;
        }
        if(pocketsDirty) UpdatePockets();
        if(PocketPeople==0)return;
        rotationBlock.SetVector("_RRPocketRotation",new Vector4(Mathf.Cos(angle),Mathf.Sin(angle),0,0));
        pocketRenderer.SetPropertyBlock(rotationBlock);
    }
    void UpdatePockets()
    {
        pocketsDirty=false;
        if(PocketPeople==0) {
            if(pocketRenderer)pocketRenderer.enabled=false;
            return;
        }
        if(!pocketMesh) {
            var body=new GameObject("Passagers dans les pales");
            body.transform.SetParent(transform,false);
            pocketMesh=new Mesh {name="Passagers en rotation"};
            pocketMesh.MarkDynamic();
            body.AddComponent<MeshFilter>().sharedMesh=pocketMesh;
            pocketRenderer=body.AddComponent<MeshRenderer>();
            pocketRenderer.sharedMaterial=GetComponent<MeshRenderer>().sharedMaterial;
            rotationBlock=new MaterialPropertyBlock();
        }
        corners.Clear();sprites.Clear();anchors.Clear();indices.Clear();
        float extent=0;
        foreach(var group in batches) {
            extent=Mathf.Max(extent,group.radius+1);
            for(int i=0;i<group.seats;i++) {
                float u=(i+.5f)/group.seats;
                float r=Mathf.Lerp(.34f,.93f,Mathf.Sqrt(u));
                float jitter=Mathf.Repeat(i*.618034f,1)-.5f;
                float theta=group.heading+jitter*group.arc*.68f-(r-.68f)*group.curvature;
                var anchor=new Vector2(Mathf.Sin(theta),Mathf.Cos(theta))*(r*group.radius);
                int n=corners.Count;
                const float half=.17f;
                corners.Add(new Vector3(-half,0,0));corners.Add(new Vector3(half,0,0));
                corners.Add(new Vector3(half,.68f,0));corners.Add(new Vector3(-half,.68f,0));
                for(int k=0;k<4;k++)anchors.Add(anchor);
                float x=(i%16)/16f,y=(i%8)*2;
                sprites.Add(new Vector2(x,y));sprites.Add(new Vector2(x+1f/16,y));
                sprites.Add(new Vector2(x+1f/16,y+.999f));sprites.Add(new Vector2(x,y+.999f));
                indices.Add(n);indices.Add(n+2);indices.Add(n+1);
                indices.Add(n);indices.Add(n+3);indices.Add(n+2);
            }
        }
        pocketMesh.Clear();
        pocketMesh.SetVertices(corners);pocketMesh.SetUVs(0,sprites);pocketMesh.SetUVs(1,anchors);
        pocketMesh.SetTriangles(indices,0,false);
        pocketMesh.bounds=new Bounds(Vector3.up*.34f,new Vector3(extent*2,1,extent*2));
        pocketRenderer.enabled=true;
    }
}
