using UnityEngine;

public sealed class Visitor : MonoBehaviour
{
    public Transform leftLeg, rightLeg, leftArm, rightArm, accessory;
    [Min(.2f)] public float walkingSpeed = 2.2f;
    public string role { get; private set; }
    public bool InLine => phase == Phase.Queue;
    public bool JustLanded { get; private set; }
    public bool Finished => phase == Phase.Done;
    enum Phase { Queue, Riding, Leaving, Flying, Recovering, Done }
    Phase phase;
    float age, travel, lane, seed, radius, pace;
    Vector3 origin;
    bool fling;
    Vector3 normalSize;

    void Awake() { normalSize = transform.localScale; }
    public void Arrive(Vector3 position, string kind, int id)
    {
        role = kind; seed = Mathf.Repeat(id * .618034f, 1); lane = (seed - .5f) * 1.3f;
        phase = Phase.Queue; age = 0; travel = 0;
        transform.SetPositionAndRotation(position, Quaternion.identity);
        transform.localScale = normalSize * (kind == "Géant" ? 2f : 1f);
        if (accessory) accessory.gameObject.SetActive(kind != "Passant");
        gameObject.SetActive(true);
    }
    public void Board(bool thrown, float gateRadius)
    {
        phase = Phase.Riding; age = travel = 0; fling = thrown; origin = transform.position;
        radius = gateRadius * (.48f + seed * .26f);
    }
    [System.Serializable] public class Record {
        public string kind; public Vector3 position,origin; public Quaternion rotation;
        public int phase; public float age,travel,lane,seed,radius,pace; public bool fling;
    }
    public Record Capture()=>new Record{kind=role,position=transform.position,rotation=transform.rotation,origin=origin,
        phase=(int)phase,age=age,travel=travel,lane=lane,seed=seed,radius=radius,pace=pace,fling=fling};
    public void Restore(Record r){
        Arrive(r.position,r.kind,0);origin=r.origin;phase=(Phase)r.phase;age=r.age;travel=r.travel;
        lane=r.lane;seed=r.seed;radius=r.radius;pace=r.pace;fling=r.fling;transform.rotation=r.rotation;
    }
    public void Step(float dt, float velocity, int place, float gateRadius, bool gallery)
    {
        JustLanded = false;
        age += dt; pace += dt * walkingSpeed * 4;
        var p = transform.position;
        if (phase == Phase.Queue)
        {
            int row = place / 3;
            float offset = (place % 3 - 1) * .26f + lane * .22f;
            var target = new Vector3(offset - .42f * Mathf.Sin(row * .25f), 0, -gateRadius - .19f - .26f * row);
            p = Vector3.MoveTowards(p, target, walkingSpeed * dt);
        }
        else if (phase == Phase.Riding)
        {
            travel = Mathf.Min(Mathf.PI, travel + dt * Mathf.Max(2.4f, velocity));
            Vector3 orbit = new Vector3(-Mathf.Sin(travel)*radius, 0, -Mathf.Cos(travel)*radius);
            p = Vector3.Lerp(origin, orbit, Mathf.SmoothStep(0,1,age/.48f));
            if (travel >= Mathf.PI) { origin = p; phase = fling ? Phase.Flying : Phase.Leaving; age = 0; }
        }
        else if (phase == Phase.Flying)
        {
            float u = Mathf.Clamp01(age);
            p = origin + new Vector3((seed-.5f)*7*u, 8*u*(1-u), 3*u);
            transform.rotation = Quaternion.Euler(0,0,360*u);
            if (u >= 1) { phase = Phase.Recovering; age = 0; JustLanded = true; }
        }
        else if (phase == Phase.Recovering)
        {
            p.y = .2f * Mathf.Abs(Mathf.Sin(age*10)) * Mathf.Clamp01(1-age/.35f);
            if (age >= .35f) { p.y=0; phase=Phase.Queue; }
        }
        else if (phase == Phase.Leaving)
        {
            if (gallery) {
                var landing = new Vector3(-3.55f + lane * .22f, 0, 1.93f);
                var bottom = landing + new Vector3(0, -.82f, -1.48f);
                float walk = Vector3.Distance(origin, landing) / walkingSpeed;
                p = age < walk ? Vector3.Lerp(origin, landing, age / walk)
                               : Vector3.Lerp(landing, bottom, (age - walk) / .93f);
                if (age >= walk + .93f) phase = Phase.Done;
            } else {
                var direction = new Vector3(lane * .7f, 0, 1).normalized;
                p = origin + direction * walkingSpeed * age;
                if (age >= 5) phase = Phase.Done;
            }
        }
        Vector3 movement = p - transform.position;
        movement.y = 0;
        if (phase != Phase.Flying && phase != Phase.Recovering && movement.sqrMagnitude > .000001f)
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(movement), Mathf.Clamp01(dt * 14));
        transform.position = p;
        float swing = Mathf.Sin(pace + seed * 6) * Mathf.Min(1, movement.magnitude / Mathf.Max(.001f, dt)) * 24;
        if (leftArm) leftArm.localRotation = Quaternion.Euler(-swing, 0, -8);
        if (rightArm) rightArm.localRotation = Quaternion.Euler(swing, 0, 8);
        if (leftLeg) leftLeg.localRotation=Quaternion.Euler(swing,0,0);
        if (rightLeg) rightLeg.localRotation=Quaternion.Euler(-swing,0,0);
    }
}
