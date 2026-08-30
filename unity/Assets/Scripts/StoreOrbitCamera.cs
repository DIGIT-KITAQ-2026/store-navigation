using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

/// <summary>
/// 店舗中央（target）を注視点として周回するPC向けOrbitカメラ。
/// 左ドラッグで回転、マウスホイールでtargetからの距離をズームする。
/// 自由飛行やパン移動は行わず、常にtargetを注視する。
/// </summary>
public class StoreOrbitCamera : MonoBehaviour
{
    [Header("注視点")]
    [Tooltip("カメラが周回する中心のTransform（CameraTargetを指定）")]
    [SerializeField] private Transform target;

    [Header("回転設定")]
    [Tooltip("マウス1ピクセル移動あたりの回転角度（度）")]
    [SerializeField] private float rotationSpeed = 0.25f;

    [Tooltip("上下角度（Pitch）の下限（度）。小さいほど水平に近い視点")]
    [SerializeField] private float minPitch = 15f;

    [Tooltip("上下角度（Pitch）の上限（度）。大きいほど真上に近い視点")]
    [SerializeField] private float maxPitch = 80f;

    [Header("ズーム設定")]
    [Tooltip("マウスホイール1メモリあたりの距離変化量（メートル）")]
    [SerializeField] private float zoomSpeed = 0.02f;

    [Tooltip("targetに最も近づける距離（メートル）")]
    [SerializeField] private float minDistance = 10f;

    [Tooltip("targetから最も離れられる距離（メートル）")]
    [SerializeField] private float maxDistance = 28f;

    [Header("操作感の調整（任意・過度に複雑にしない）")]
    [Tooltip("回転の滑らかさ。大きいほど追従が速く、小さいほど滑らかに遅延する")]
    [SerializeField] private float rotationSmoothing = 18f;

    [Tooltip("ズームの滑らかさ。大きいほど追従が速く、小さいほど滑らかに遅延する")]
    [SerializeField] private float zoomSmoothing = 8f;

    // 実際に適用される現在値（滑らかに追従する）
    private float yaw;
    private float pitch;
    private float distance;

    // 入力によって更新される目標値
    private float targetYaw;
    private float targetPitch;
    private float targetDistance;

    // ResetView() で復元する初期値（現在のMain Cameraの見た目から算出）
    private float initialYaw;
    private float initialPitch;
    private float initialDistance;

    private bool isDragging;

    private void Awake()
    {
        if (target == null)
        {
            Debug.LogWarning("[StoreOrbitCamera] target が設定されていません。Inspectorで CameraTarget を指定してください。");
            enabled = false;
            return;
        }

        InitializeFromCurrentTransform();
    }

    /// <summary>
    /// 現在のカメラのTransformから、targetを中心とした
    /// Yaw / Pitch / 距離を逆算し、初期状態として保持する。
    /// これによりPlay開始直後の見た目を変えずにOrbit化できる。
    /// </summary>
    private void InitializeFromCurrentTransform()
    {
        Vector3 offset = transform.position - target.position;
        float horizontalDistance = new Vector2(offset.x, offset.z).magnitude;

        distance = Mathf.Clamp(offset.magnitude, minDistance, maxDistance);
        pitch = Mathf.Clamp(Mathf.Atan2(offset.y, horizontalDistance) * Mathf.Rad2Deg, minPitch, maxPitch);
        yaw = Mathf.Atan2(-offset.x, -offset.z) * Mathf.Rad2Deg;

        targetYaw = yaw;
        targetPitch = pitch;
        targetDistance = distance;

        initialYaw = yaw;
        initialPitch = pitch;
        initialDistance = distance;

        ApplyTransform();
    }

    private void Update()
    {
        if (target == null) return;

        HandleRotationInput();
        HandleZoomInput();

        // フレームレートに依存しすぎない指数的スムージング
        float rotLerp = 1f - Mathf.Exp(-rotationSmoothing * Time.deltaTime);
        float zoomLerp = 1f - Mathf.Exp(-zoomSmoothing * Time.deltaTime);

        yaw = Mathf.Lerp(yaw, targetYaw, rotLerp);
        pitch = Mathf.Lerp(pitch, targetPitch, rotLerp);
        distance = Mathf.Lerp(distance, targetDistance, zoomLerp);

        ApplyTransform();
    }

    /// <summary>
    /// 左ドラッグのみで回転する。ドラッグ開始時にUI上であれば回転を開始しない。
    /// </summary>
    private void HandleRotationInput()
    {
        Mouse mouse = Mouse.current;
        if (mouse == null) return;

        if (mouse.leftButton.wasPressedThisFrame)
        {
            isDragging = !IsPointerOverUI();
        }

        if (mouse.leftButton.wasReleasedThisFrame)
        {
            isDragging = false;
        }

        if (!isDragging || !mouse.leftButton.isPressed)
        {
            return;
        }

        Vector2 delta = mouse.delta.ReadValue();
        targetYaw += delta.x * rotationSpeed;
        targetPitch = Mathf.Clamp(targetPitch - delta.y * rotationSpeed, minPitch, maxPitch);
    }

    /// <summary>
    /// マウスホイールでtargetからの距離を変更する（FOV変更ではない）。
    /// </summary>
    private void HandleZoomInput()
    {
        if (IsPointerOverUI()) return;

        Mouse mouse = Mouse.current;
        if (mouse == null) return;

        float scroll = mouse.scroll.ReadValue().y;
        if (Mathf.Approximately(scroll, 0f)) return;

        targetDistance = Mathf.Clamp(targetDistance - scroll * zoomSpeed, minDistance, maxDistance);
    }

    private bool IsPointerOverUI()
    {
        return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
    }

    private void ApplyTransform()
    {
        Quaternion rotation = Quaternion.Euler(pitch, yaw, 0f);
        Vector3 position = target.position + rotation * new Vector3(0f, 0f, -distance);
        transform.SetPositionAndRotation(position, rotation);
    }

    /// <summary>
    /// カメラの視点（Yaw / Pitch / targetからの距離）を初期状態へ戻す。
    /// キー割り当てやUIボタンはこのメソッドでは追加しない。
    /// </summary>
    public void ResetView()
    {
        targetYaw = initialYaw;
        targetPitch = initialPitch;
        targetDistance = initialDistance;
    }
}
