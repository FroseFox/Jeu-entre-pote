using UnityEngine;

public sealed class Visitor : MonoBehaviour
{
    public Transform leftLeg, rightLeg, leftArm, rightArm, accessory;
    [Min(.2f)] public float walkingSpeed = 2.2f;
    public string role { get; private set; }
    public bool InLine => phase == Phase.Queue;
    public bool InReturnLine => phase == Phase.Returning;
    public bool HoldsPlace => InLine || InReturnLine || phase == Phase.Flying || phase == Phase.Recovering
                              || phase == Phase.ReturnRide || (phase == Phase.Riding && fling);
    public bool JustLanded { get; private set; }
    public bool Finished => phase == Phase.Done;
    // Keep the values of the original phases for saved games.
    enum Phase { Queue, Riding, Leaving, Flying, Recovering, Done, Returning, ReturnRide }
    Phase phase;
    float age, travel, lane, seed, radius, pace, seatYaw, launchSpeed;
    Vector3 origin;
    bool fling;
    Vector3 normalSize;

    void Awake() { normalSize = transform.localScale; }
    public void Arrive(Vector3 position, string kind, int id)
    {
        role = kind;
        seed = Mathf.Repeat(id * .618034f, 1);
        lane = (seed - .5f) * 1.3f;
        phase = Phase.Queue;
        age = travel = pace = 0;
        fling = JustLanded = false;
        transform.SetPositionAndRotation(position, Quaternion.identity);
        transform.localScale = normalSize * (kind == "Géant" ? 2f : 1f);
        if (accessory) accessory.gameObject.SetActive(kind != "Passant");
        gameObject.SetActive(true);
    }
    public bool AtMouth(float gateRadius)
    {
        var p = transform.position;
        float approach = InReturnLine ? p.z : -p.z;
        return Mathf.Abs(p.x) < gateRadius * .62f && approach >= gateRadius * .72f && approach < gateRadius + .68f;
    }
    public void Board(bool thrown, float gateRadius, float rotorAngle, int blades, float curvature, float speed)
    {
        bool returning = InReturnLine;
        phase = returning ? Phase.ReturnRide : Phase.Riding;
        age = travel = 0;
        fling = thrown;
        origin = transform.position;
        float reach = .51f + seed * .31f;
        radius = gateRadius * reach;
        launchSpeed = speed;
        // At this radius, find the blade pocket nearest to the mouth.
        float arc = 2 * Mathf.PI / blades;
        float pocket = rotorAngle + Mathf.PI / 2 - curvature + arc * .5f;
        float mouth = returning ? 0 : Mathf.PI;
        seatYaw = pocket + Mathf.Round((mouth - pocket) / arc) * arc + (seed-.5f)*arc*.22f;
    }
    [System.Serializable] public class Record {
        public string kind; public Vector3 position,origin; public Quaternion rotation;
        public int phase; public float age,travel,lane,seed,radius,pace; public bool fling;
        public bool hasSeat; public float seatYaw,launchSpeed;
    }
    public Record Capture()=>new Record{kind=role,position=transform.position,rotation=transform.rotation,origin=origin,
        phase=(int)phase,age=age,travel=travel,lane=lane,seed=seed,radius=radius,pace=pace,fling=fling,
        hasSeat=true,seatYaw=seatYaw,launchSpeed=launchSpeed};
    public void Restore(Record r){
        Arrive(r.position,r.kind,0);origin=r.origin;phase=(Phase)r.phase;age=r.age;travel=r.travel;
        lane=r.lane;seed=r.seed;radius=r.radius;pace=r.pace;fling=r.fling;transform.rotation=r.rotation;
        seatYaw=r.hasSeat?r.seatYaw:Mathf.PI;
        launchSpeed=r.hasSeat?r.launchSpeed:6;
    }
    public void Step(float dt, float turn, int place, float gateRadius, bool gallery)
    {
        JustLanded = false;
        age += dt;
        var previous = transform.position;
        var p = previous;
        if (InLine || InReturnLine)
        {
            int row = place / 3;
            float spread = (place % 3 - 1) * .26f + lane * .22f;
            float side = InReturnLine ? 1 : -1;
            var target = new Vector3(spread - .55f * Mathf.Sin(row*.26f)*side, 0, side*(gateRadius+.16f+.25f*row));
            p = Vector3.MoveTowards(p, target, walkingSpeed * dt);
        }
        else if (phase == Phase.Riding || phase == Phase.ReturnRide)
        {
            travel = Mathf.Min(Mathf.PI, travel + turn);
            float angle = seatYaw + travel;
            var pocket = new Vector3(Mathf.Sin(angle)*radius,0,Mathf.Cos(angle)*radius);
            p = Vector3.Lerp(origin,pocket,Mathf.SmoothStep(0,1,age/.30f));
            if (travel >= Mathf.PI) {
                if (phase == Phase.ReturnRide) { phase=Phase.Queue; }
                else {phase = fling ? Phase.Flying : Phase.Leaving;}
                origin=p;age=0;
            }
        }
        else if (phase == Phase.Flying)
        {
            float strength = Mathf.Clamp(launchSpeed / 8,.55f,1.6f);
            float u = Mathf.Clamp01(age / (.66f + strength*.24f));
            float distance = (2.9f+seed*1.7f)*strength;
            var direction = new Vector3((seed-.5f)*1.35f,0,1).normalized;
            p = origin + direction*(distance*u);
            p.y += (1.2f+strength*.8f)*4*u*(1-u);
            transform.rotation=Quaternion.Euler(70*u,seed*160,Mathf.Sin(seed*11)>0?350*u:-350*u);
            if(u>=1) {phase=Phase.Recovering;age=0;origin=p;JustLanded=true;}
        }
        else if (phase == Phase.Recovering)
        {
            float up=Mathf.SmoothStep(0,1,age/.42f);
            p=origin;p.y=.12f*Mathf.Sin(up*Mathf.PI);
            transform.rotation=Quaternion.Euler(70*(1-up),seed*160,0);
            if(age>=.42f) {phase=Phase.Returning;age=0;}
        }
        else if (phase == Phase.Leaving)
        {
            var exit = new Vector3(lane*.35f,0,gateRadius+.46f);
            float walk = Vector3.Distance(origin,exit)/walkingSpeed;
            if(age<walk) p=Vector3.Lerp(origin,exit,age/Mathf.Max(.001f,walk));
            else if(gallery) {
                var landing = new Vector3(-3.55f+lane*.22f,0,1.93f);
                var bottom = landing + new Vector3(0,-.82f,-1.48f);
                float crossing=Vector3.Distance(exit,landing)/walkingSpeed;
                float t=age-walk;
                p=t<crossing?Vector3.Lerp(exit,landing,t/crossing):Vector3.Lerp(landing,bottom,(t-crossing)/.93f);
                if(t>=crossing+.93f)phase=Phase.Done;
            } else {
                p=exit+new Vector3(lane*.94f,0,1).normalized*(walkingSpeed*(age-walk));
                if(age>=walk+5)phase=Phase.Done;
            }
        }
        Vector3 movement=p-previous;movement.y=0;
        float stride=movement.magnitude;
        if(phase!=Phase.Flying && phase!=Phase.Recovering && stride>.0005f)
            transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(movement),Mathf.Clamp01(dt*14));
        transform.position=p;
        pace+=stride*12;
        float swing=Mathf.Sin(pace+seed*6)*Mathf.Min(1,stride/Mathf.Max(.001f,dt))*24;
        if(leftArm)leftArm.localRotation=Quaternion.Euler(-swing,0,-8);
        if(rightArm)rightArm.localRotation=Quaternion.Euler(swing,0,8);
        if(leftLeg)leftLeg.localRotation=Quaternion.Euler(swing,0,0);
        if(rightLeg)rightLeg.localRotation=Quaternion.Euler(-swing,0,0);
    }
}
