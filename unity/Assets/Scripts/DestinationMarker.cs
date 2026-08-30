using UnityEngine;
using TMPro;

/// <summary>
/// 案内中の対象棚を示す単一の目的地マーカー。
/// 責務は表示位置と文字列の更新だけに限定する（シーン内に1つだけ配置）。
/// StoreNaviControllerから通常のC#メソッドとして呼び出される。
/// </summary>
public class DestinationMarker : MonoBehaviour
{
    [Tooltip("表示するTextMeshPro（未設定なら子から自動取得。表裏用に複数あってもよい）")]
    [SerializeField] private TextMeshPro[] labels;

    [Tooltip("対象棚のTransformからの表示高さオフセット（メートル）。既存の棚Sign/SignBackground（棚位置+約2.55m付近が上端）と重ならない値を設定すること。")]
    [SerializeField] private float heightOffset = 3.3f;

    private void Awake()
    {
        if (labels == null || labels.Length == 0)
        {
            labels = GetComponentsInChildren<TextMeshPro>(true);
        }

        // 非表示状態はシーン上でActive=falseとして保持されるため、
        // ここで強制的にSetActive(false)は行わない
        // （非アクティブなGameObjectはAwakeが初回アクティブ化まで実行されないため、
        //   ここでHide()を呼ぶと最初のShowForShelf直後に再度非表示化してしまう）
    }

    /// <summary>
    /// 指定した棚の上へ目的地マーカーを表示する。
    /// </summary>
    /// <param name="shelfTransform">対象棚のTransform</param>
    /// <param name="shelfNumber">棚番号(1〜8)。表示文言では使用しない（棚Sign側に既に表示されているため）</param>
    /// <param name="categoryName">カテゴリー名。表示文言では使用しない（棚Sign側に既に表示されているため）。
    /// 呼び出し側（StoreNaviController）との互換性のため引数は維持する。</param>
    public void ShowForShelf(Transform shelfTransform, int shelfNumber, string categoryName)
    {
        if (shelfTransform == null)
        {
            Debug.LogWarning("[DestinationMarker] shelfTransform が null のため表示を更新しません。");
            return;
        }

        // 非アクティブな状態ではAwakeが未実行でlabelsが空のため、
        // 先にアクティブ化してAwakeを走らせてから文字列を更新する
        gameObject.SetActive(true);

        transform.position = shelfTransform.position + Vector3.up * heightOffset;

        if (labels != null)
        {
            // カテゴリー名・棚番号は既存の棚Sign側に表示済みのため、
            // ここでは「この棚が目的地である」という役割だけを1行で示す。
            const string text = "目的地";

            foreach (TextMeshPro tmp in labels)
            {
                if (tmp != null)
                {
                    tmp.text = text;
                }
            }
        }
    }

    /// <summary>
    /// マーカーを非表示にする。
    /// </summary>
    public void Hide()
    {
        gameObject.SetActive(false);
    }
}
